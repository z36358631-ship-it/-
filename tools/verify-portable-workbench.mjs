import assert from 'node:assert/strict';
import {
  execFile as execFileCallback,
  spawn,
} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(repositoryRoot, 'dist');
const exePath = path.join(distRoot, '个人产品经理工作台.exe');
const buildManifestPath = path.join(distRoot, 'portable-build-manifest.json');
const evidencePath = path.join(
  repositoryRoot,
  'test-results',
  'personal-codex-workbench',
  'portable-exe-results.json',
);
const tokenPattern = /^[a-f0-9]{64}$/;
const activeChildren = new Set();

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function validateSession(session, workspace) {
  assert(Number.isInteger(session?.pid) && session.pid > 0, 'session PID is invalid');
  assert(
    Number.isInteger(session?.port) && session.port >= 1 && session.port <= 65535,
    'session port is invalid',
  );
  assert.match(String(session?.token || ''), tokenPattern, 'session token is invalid');
  assert.match(
    String(session?.ownerNonce || ''),
    tokenPattern,
    'session owner nonce is invalid',
  );
  assert.equal(path.resolve(session.workspace), path.resolve(workspace));
  return session;
}

function childDiagnostics(child) {
  return [
    child.output.stdout.trim(),
    child.output.stderr.trim(),
  ].filter(Boolean).join('\n').slice(-16_384);
}

function launchPortable({ cleanPath, localAppData, workspace }) {
  const child = spawn(exePath, [], {
    cwd: workspace,
    env: {
      ...process.env,
      LOCALAPPDATA: localAppData,
      NODE_OPTIONS: '',
      NODE_PATH: '',
      PATH: cleanPath,
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.output = { stderr: '', stdout: '' };
  for (const [stream, field] of [
    [child.stdout, 'stdout'],
    [child.stderr, 'stderr'],
  ]) {
    stream.on('data', chunk => {
      child.output[field] = `${child.output[field]}${chunk.toString('utf8')}`
        .slice(-1024 * 1024);
    });
  }
  activeChildren.add(child);
  child.once('exit', () => activeChildren.delete(child));
  return child;
}

async function bootstrap(session) {
  const origin = `http://127.0.0.1:${session.port}`;
  const response = await fetch(`${origin}/api/bootstrap`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      Origin: origin,
    },
    signal: AbortSignal.timeout(3_000),
  });
  assert.equal(response.ok, true, `portable bootstrap returned ${response.status}`);
  const payload = await response.json();
  assert.equal(payload.health.broker, 'ok');
  assert.equal(payload.health.codex, 'ok');
  assert.notEqual(payload.health.configuration, 'error');
  assert.notEqual(payload.health.authentication, 'error');
  return payload;
}

async function waitForSession({
  child,
  previousPid = null,
  sessionPath,
  timeoutMs = 60_000,
  workspace,
}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Portable EXE exited before creating a healthy session `
          + `(code ${child.exitCode}): ${childDiagnostics(child)}`,
      );
    }
    if (fs.existsSync(sessionPath)) {
      try {
        const session = validateSession(readJson(sessionPath), workspace);
        if (session.pid !== previousPid) {
          await bootstrap(session);
          return session;
        }
      } catch (error) {
        lastError = error;
      }
    }
    await delay(250);
  }
  throw new Error(
    `Timed out waiting for portable session`
      + `${lastError ? `: ${lastError.message}` : ''}`
      + `${childDiagnostics(child) ? `\n${childDiagnostics(child)}` : ''}`,
  );
}

function waitForExit(child, timeoutMs = 30_000) {
  if (child.exitCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Process ${child.pid} did not exit within ${timeoutMs} ms`));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

async function countListeningBrokers(port) {
  const { stdout } = await execFile(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '@(Get-NetTCPConnection -State Listen '
        + '-LocalAddress 127.0.0.1 '
        + '-LocalPort ([int]$env:WORKBENCH_PORT) '
        + '-ErrorAction SilentlyContinue).Count',
    ],
    {
      env: {
        ...process.env,
        WORKBENCH_PORT: String(port),
      },
      windowsHide: true,
    },
  );
  const count = Number.parseInt(stdout.trim(), 10);
  assert(Number.isInteger(count), `Unable to count listeners on port ${port}`);
  return count;
}

async function commandVisible(command, cleanPath) {
  try {
    await execFile('where.exe', [command], {
      env: {
        ...process.env,
        PATH: cleanPath,
      },
      windowsHide: true,
    });
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
}

async function processTree(rootPid) {
  const { stdout } = await execFile(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Process '
        + '| Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine '
        + '| ConvertTo-Json -Compress',
    ],
    {
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );
  const parsed = JSON.parse(stdout);
  const all = Array.isArray(parsed) ? parsed : [parsed];
  const wanted = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of all) {
      if (
        wanted.has(processInfo.ParentProcessId)
        && !wanted.has(processInfo.ProcessId)
      ) {
        wanted.add(processInfo.ProcessId);
        changed = true;
      }
    }
  }
  return all.filter(processInfo => wanted.has(processInfo.ProcessId));
}

function assertPortableProcessTree(tree) {
  assert(tree.length >= 2, 'portable process tree did not include Codex');
  const commandLines = tree.map(processInfo => (
    `${processInfo.ExecutablePath || ''} ${processInfo.CommandLine || ''}`
  ));
  assert.equal(
    commandLines.some(value => /(^|[\\/"\s])node\.exe(?:["\s]|$)/i.test(value)),
    false,
    'portable process tree used global node.exe',
  );
  assert.equal(
    commandLines.some(value => /(?:^|[\\/"\s])npm\.cmd(?:["\s]|$)/i.test(value)),
    false,
    'portable process tree used global npm.cmd',
  );
  assert.equal(
    commandLines.some(value => /(?:^|[\\/"\s])codex\.cmd(?:["\s]|$)/i.test(value)),
    false,
    'portable process tree used global codex.cmd',
  );
  assert(
    commandLines.some(value => (
      /\\codex-sessions\\[a-f0-9]{64}\\codex\.exe"?\s+app-server(?:\s|$)/i
        .test(value)
    )),
    'portable Codex app-server did not use the nonce-bound absolute executable',
  );
}

async function forceTerminateProcessTree(pid) {
  try {
    await execFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
    });
  } catch (error) {
    if (!['128', 128].includes(error.code)) throw error;
  }
}

async function waitForPortClosed(session, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await bootstrap(session);
    } catch {
      return;
    }
    await delay(250);
  }
  throw new Error(`Broker port ${session.port} remained open after forced termination`);
}

async function runScenarioVerifier({
  buildManifest,
  evidence,
  session,
  workspace,
}) {
  await execFile(
    process.execPath,
    [path.join(repositoryRoot, 'tools', 'verify-personal-codex-workbench-real.mjs')],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        WORKBENCH_VERIFY_CODEX_VERSION: 'codex-cli 0.130.0 (portable)',
        WORKBENCH_VERIFY_EVIDENCE: evidence,
        WORKBENCH_VERIFY_SESSION_JSON: JSON.stringify(session),
        WORKBENCH_VERIFY_SOURCE_COMMIT: buildManifest.sourceCommit,
        WORKBENCH_VERIFY_WORKSPACE: workspace,
      },
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );
  const scenarios = readJson(evidence);
  assert.equal(scenarios.status, 'passed');
  assert.equal(scenarios.readOnlyRun.status, 'completed');
  assert.deepEqual(
    Object.keys(scenarios.workflows).sort(),
    ['demo-prd-review', 'feedback-triage', 'issue-strategy'],
  );
  assert.equal(scenarios.writeRun.status, 'completed');
  assert.equal(scenarios.restored.candidateAbsent, true);
  return scenarios;
}

async function main() {
  assert.equal(process.platform, 'win32', 'Portable verification requires Windows');
  assert.equal(process.arch, 'x64', 'Portable verification requires Windows x64');
  assert.equal(fs.existsSync(exePath), true, `Portable EXE is missing: ${exePath}`);
  assert.equal(
    fs.existsSync(buildManifestPath),
    true,
    `Portable build manifest is missing: ${buildManifestPath}`,
  );

  const buildManifest = readJson(buildManifestPath);
  const exeBytes = fs.statSync(exePath).size;
  const exeSha256 = sha256File(exePath);
  assert.equal(exeBytes, buildManifest.artifact.bytes);
  assert.equal(exeSha256, buildManifest.artifact.sha256);
  assert.equal(buildManifest.artifact.signed, false);
  assert(exeBytes <= 400 * 1024 * 1024, 'Portable EXE exceeds the 400 MB limit');
  assert.equal(buildManifest.dependencies.node, 'v24.12.0');
  assert.equal(buildManifest.dependencies.codex, '0.130.0');
  assert.equal(buildManifest.dependencies.postject, '1.0.0-alpha.6');

  const systemRoot = process.env.SystemRoot;
  assert(systemRoot, 'SystemRoot is unavailable');
  const cleanPath = [
    systemRoot,
    path.join(systemRoot, 'System32'),
    path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
  ].join(path.delimiter);
  const nodeOnTestPath = await commandVisible('node.exe', cleanPath);
  const npmOnTestPath = await commandVisible('npm.cmd', cleanPath);
  const globalCodexOnTestPath = await commandVisible('codex.cmd', cleanPath);
  assert.equal(nodeOnTestPath, false);
  assert.equal(npmOnTestPath, false);
  assert.equal(globalCodexOnTestPath, false);

  const verificationRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'portable-workbench-verify-'),
  );
  const localAppData = path.join(verificationRoot, 'LocalAppData');
  const workspace = path.join(verificationRoot, 'workspace');
  const appRoot = path.join(localAppData, 'PersonalCodexWorkbench');
  const sessionPath = path.join(appRoot, 'session.json');
  const lockPath = path.join(appRoot, 'instance.lock');
  const portableScenarioEvidence = path.join(
    verificationRoot,
    'portable-real-scenarios.json',
  );
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(appRoot, { recursive: true });
  fs.writeFileSync(
    path.join(appRoot, 'settings.json'),
    `${JSON.stringify({ workspace }, null, 2)}\n`,
    'utf8',
  );

  let first;
  let recovery;
  try {
    process.stdout.write(
      'Portable verification uses the current Codex login; first login requires networking.\n',
    );
    first = launchPortable({ cleanPath, localAppData, workspace });
    const firstSession = await waitForSession({
      child: first,
      sessionPath,
      workspace,
    });
    assert.equal(firstSession.pid, first.pid);
    assert.equal(await countListeningBrokers(firstSession.port), 1);

    const tree = await processTree(first.pid);
    assertPortableProcessTree(tree);
    const scenarios = await runScenarioVerifier({
      buildManifest,
      evidence: portableScenarioEvidence,
      session: firstSession,
      workspace,
    });

    const second = launchPortable({ cleanPath, localAppData, workspace });
    const secondExit = await waitForExit(second);
    assert.equal(
      secondExit.code,
      0,
      `duplicate launch failed: ${childDiagnostics(second)}`,
    );
    const reusedSession = validateSession(readJson(sessionPath), workspace);
    assert.equal(reusedSession.pid, firstSession.pid);
    assert.equal(reusedSession.ownerNonce, firstSession.ownerNonce);
    assert.equal(await countListeningBrokers(firstSession.port), 1);

    await forceTerminateProcessTree(first.pid);
    await waitForExit(first).catch(() => {});
    await waitForPortClosed(firstSession);
    assert.equal(fs.existsSync(sessionPath), true, 'forced stop did not leave stale session');
    assert.equal(fs.existsSync(lockPath), true, 'forced stop did not leave stale lock');

    const runtimePath = path.join(
      appRoot,
      'runtime',
      buildManifest.payload.payloadVersion,
    );
    const extractedServer = path.join(runtimePath, 'workbench', 'server.mjs');
    const serverManifest = buildManifest.payload.files.find(
      value => value.path === 'workbench/server.mjs',
    );
    assert(serverManifest, 'workbench/server.mjs is absent from payload manifest');
    fs.appendFileSync(extractedServer, Buffer.from([0]));
    assert.notEqual(sha256File(extractedServer), serverManifest.sha256);

    recovery = launchPortable({ cleanPath, localAppData, workspace });
    const recoverySession = await waitForSession({
      child: recovery,
      previousPid: firstSession.pid,
      sessionPath,
      workspace,
    });
    assert.equal(recoverySession.pid, recovery.pid);
    assert.equal(sha256File(extractedServer), serverManifest.sha256);
    assert.equal(await countListeningBrokers(recoverySession.port), 1);

    const report = {
      artifact: {
        path: 'dist/个人产品经理工作台.exe',
        bytes: exeBytes,
        sha256: exeSha256,
        signed: false,
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeOnTestPath,
        npmOnTestPath,
        globalCodexOnTestPath,
      },
      checks: {
        assetExtraction: 'pass',
        manifestVerification: 'pass',
        realCodexReadOnly: scenarios.readOnlyRun.status === 'completed' ? 'pass' : 'fail',
        threeWorkflows: Object.keys(scenarios.workflows).length === 3 ? 'pass' : 'fail',
        isolatedWriteRestore: scenarios.restored.candidateAbsent ? 'pass' : 'fail',
        duplicateLaunchReuse: 'pass',
        corruptCacheRecovery: 'pass',
        forcedShutdownStaleRecovery: 'pass',
        gracefulShutdown: 'covered-by-launcher-unit-test',
      },
      cleanWindowsMachine: 'not-tested',
    };
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`Portable verification PASS: ${evidencePath}\n`);
  } finally {
    for (const child of [...activeChildren]) {
      if (child.exitCode === null) {
        await forceTerminateProcessTree(child.pid).catch(() => {});
        await waitForExit(child, 5_000).catch(() => {});
      }
    }
    const resolvedTemp = path.resolve(verificationRoot);
    const resolvedSystemTemp = path.resolve(os.tmpdir());
    const relative = path.relative(resolvedSystemTemp, resolvedTemp);
    if (
      relative
      && relative !== '..'
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative)
    ) {
      fs.rmSync(resolvedTemp, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
