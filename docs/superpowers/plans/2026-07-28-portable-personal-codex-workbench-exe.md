# Portable Personal Codex Workbench EXE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `dist/个人产品经理工作台.exe`, a Windows 10/11 x64 single-file launcher that embeds the workbench and Codex CLI, performs a safe first-run setup, and starts the existing local Broker without requiring a preinstalled Node.js, npm, or Codex CLI.

**Architecture:** A Node 24.12.0 Single Executable Application contains a ZIP payload plus immutable payload metadata as SEA assets. The SEA entry verifies and atomically extracts the payload into a versioned `%LOCALAPPDATA%` cache, then dynamically imports a portable launcher that chooses the workspace, checks Codex login, enforces a single Broker instance, and opens the tokenized loopback URL. Portable Codex is launched by absolute path with an argument array and `shell:false`; a nonce-named junction makes the existing crash-recovery ledger verifiable without putting the nonce in a shell command.

**Tech Stack:** Node.js 24.12.0 SEA, Node built-ins (`node:sea`, `node:sqlite`, `child_process`, `crypto`, `fs`, `http`), PowerShell `Expand-Archive` and Windows Forms, Codex CLI 0.130.0, postject 1.0.0-alpha.6, Node test runner.

---

## File map

- Modify `package.json`: pin build dependencies and expose portable build/verify scripts.
- Create `package-lock.json`: lock `@openai/codex` and `postject`, including the Windows x64 native Codex package.
- Modify `workbench/lib/config.mjs`: distinguish development and portable Codex launch configuration.
- Modify `workbench/lib/codex-app-server-client.mjs`: accept `command`, `args`, `shell`, and a controlled nonce factory.
- Modify `workbench/lib/process-control.mjs`: recognize nonce-bound direct portable `codex.exe app-server` processes in addition to the development `cmd.exe` wrapper.
- Modify `workbench/server.mjs`: pass the resolved Codex launch configuration to `CodexAppServerClient`.
- Create `workbench/portable/constants.mjs`: centralize application paths, version, and seed file mappings.
- Create `workbench/portable/launcher-state.mjs`: settings, workspace validation, seed copying, session ownership, nonce-bound Codex junctions, and health reuse.
- Create `workbench/portable/windows.mjs`: safe PowerShell/Windows integrations for folder selection, login, archive expansion, and browser opening.
- Create `workbench/portable/launcher.mjs`: orchestrate first run, single instance, Broker lifecycle, browser opening, and shutdown.
- Create `workbench/portable/sea-entry.cjs`: read SEA assets, verify ZIP hash, atomically extract, verify every manifest entry, and dynamically import the launcher.
- Create `tools/build-portable-workbench.mjs`: stage the explicit payload allowlist, create the manifest and ZIP, build/inject the SEA, and emit checksums.
- Create `tools/verify-portable-workbench.mjs`: verify artifact contents and smoke-test the EXE with a PATH that has no global Node/npm/Codex.
- Modify `tools/verify-personal-codex-workbench-real.mjs`: add an external-session adapter so the built EXE is tested through the same real Codex scenarios.
- Create `test/workbench/portable-config.test.mjs`: portable/development Codex configuration tests.
- Create `test/workbench/portable-cache.test.mjs`: manifest, corruption, extraction, and cache reuse tests.
- Create `test/workbench/portable-launcher-state.test.mjs`: workspace, seeds, session, logging, and nonce-junction tests.
- Create `test/workbench/portable-launcher.test.mjs`: first-run, reuse, ambiguous PID, login failure, and shutdown orchestration tests.
- Create `test/workbench/portable-build.test.mjs`: payload allowlist, manifest, dependency pin, and SEA configuration tests.
- Create `test-results/personal-codex-workbench/portable-exe-results.json`: machine-readable final verification evidence.
- Create `docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md`: human-readable artifact and clean-machine verification status.

### Task 1: Lock the portable build contract

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `test/workbench/portable-build.test.mjs`

- [ ] **Step 1: Write the failing dependency and script contract test**

```js
// test/workbench/portable-build.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('portable build dependencies and scripts are exactly pinned', () => {
  assert.equal(packageJson.devDependencies['@openai/codex'], '0.130.0');
  assert.equal(packageJson.devDependencies.postject, '1.0.0-alpha.6');
  assert.equal(
    packageJson.scripts['workbench:build-portable'],
    'node tools/build-portable-workbench.mjs',
  );
  assert.equal(
    packageJson.scripts['workbench:verify-portable'],
    'node tools/verify-portable-workbench.mjs',
  );
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test test/workbench/portable-build.test.mjs`

Expected: FAIL because `devDependencies` and the two scripts do not exist.

- [ ] **Step 3: Add the pinned dependencies and scripts**

```json
{
  "scripts": {
    "workbench:start": "node workbench/server.mjs",
    "workbench:test": "node --test test/workbench/*.test.mjs",
    "workbench:verify-ui": "node tools/verify-personal-codex-workbench-ui.mjs",
    "workbench:verify-real": "node tools/verify-personal-codex-workbench-real.mjs",
    "workbench:build-portable": "node tools/build-portable-workbench.mjs",
    "workbench:verify-portable": "node tools/verify-portable-workbench.mjs"
  },
  "dependencies": {
    "docx": "^9.6.1",
    "playwright-core": "1.61.1"
  },
  "devDependencies": {
    "@openai/codex": "0.130.0",
    "postject": "1.0.0-alpha.6"
  }
}
```

Run: `npm.cmd install`

Expected: `package-lock.json` is created and records exact resolved versions without changing unrelated source files.

- [ ] **Step 4: Run the contract test and the existing suite**

Run: `node --test test/workbench/portable-build.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all pre-existing 132 tests plus the new contract test pass.

- [ ] **Step 5: Commit the build contract**

```powershell
git add -- package.json package-lock.json test/workbench/portable-build.test.mjs
git commit -m "build: lock portable workbench toolchain"
```

### Task 2: Make the Codex launch path portable without weakening development mode

**Files:**
- Modify: `workbench/lib/config.mjs`
- Modify: `workbench/lib/codex-app-server-client.mjs`
- Modify: `workbench/server.mjs`
- Modify: `test/workbench/config-security.test.mjs`
- Modify: `test/workbench/codex-app-server-client.test.mjs`
- Create: `test/workbench/portable-config.test.mjs`

- [ ] **Step 1: Write failing portable configuration tests**

```js
// test/workbench/portable-config.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createConfig } from '../../workbench/lib/config.mjs';

const nonce = '8'.repeat(64);
const portableCommand = path.resolve(
  'C:/runtime/codex-sessions',
  nonce,
  'codex.exe',
);

test('portable config accepts only an absolute Codex executable and controlled nonce', () => {
  const config = createConfig({
    WORKBENCH_ROOT: path.resolve('C:/workspace'),
    WORKBENCH_CODEX_COMMAND: portableCommand,
    WORKBENCH_CODEX_NONCE: nonce,
  });
  assert.equal(config.codexCommand, portableCommand);
  assert.deepEqual(config.codexArgs, ['app-server']);
  assert.equal(config.codexShell, false);
  assert.equal(config.codexProcessNonce, nonce);
});

test('portable config rejects partial, relative, or malformed launch input', () => {
  assert.throws(
    () => createConfig({ WORKBENCH_CODEX_COMMAND: 'codex.exe' }),
    /absolute/,
  );
  assert.throws(
    () => createConfig({
      WORKBENCH_CODEX_COMMAND: portableCommand,
      WORKBENCH_CODEX_NONCE: 'not-a-nonce',
    }),
    /64 lowercase hexadecimal/,
  );
  assert.throws(
    () => createConfig({ WORKBENCH_CODEX_NONCE: nonce }),
    /WORKBENCH_CODEX_COMMAND/,
  );
});

test('development config remains fixed and ignores arbitrary argument injection', () => {
  const config = createConfig({
    WORKBENCH_CODEX_ARGS: '--dangerous arbitrary command',
  });
  assert.equal(config.codexCommand, 'codex.cmd');
  assert.deepEqual(config.codexArgs, ['app-server']);
  assert.equal(config.codexShell, process.platform === 'win32');
  assert.equal(config.codexProcessNonce, null);
});
```

- [ ] **Step 2: Extend the client launch test so portable mode must use an array and `shell:false`**

```js
test('portable client launches an absolute codex.exe with args and shell false', async () => {
  const child = fakeProcess({ pid: 7301 });
  const launches = [];
  const writes = [];
  const nonce = '9'.repeat(64);
  const command = 'C:\\runtime\\codex-sessions\\'
    + `${nonce}\\codex.exe`;
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    writes.push(message);
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({
    command,
    args: ['app-server'],
    shell: false,
    nonceFactory: () => nonce,
    spawnProcess: (launchCommand, args, options) => {
      launches.push({ command: launchCommand, args, options });
      return child;
    },
  });

  await client.start();
  assert.equal(launches[0].command, command);
  assert.deepEqual(launches[0].args, ['app-server']);
  assert.equal(launches[0].options.shell, false);
  assert.equal(
    launches[0].options.env.PERSONAL_CODEX_WORKBENCH_NONCE,
    nonce,
  );
  assert.deepEqual(client.diagnostics().command, command);
  await client.stop();
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run: `node --test test/workbench/portable-config.test.mjs test/workbench/codex-app-server-client.test.mjs`

Expected: FAIL because portable config and client constructor properties are not implemented.

- [ ] **Step 4: Implement the configuration contract**

Replace the fixed Codex fields in `createConfig` with:

```js
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
    throw new Error('WORKBENCH_CODEX_NONCE must be 64 lowercase hexadecimal characters');
  }
  return {
    codexArgs: Object.freeze(['app-server']),
    codexCommand: path.resolve(command),
    codexProcessNonce: nonce,
    codexShell: false,
  };
}
```

Inside `createConfig`, call `const codex = codexLaunchConfig(env);` and spread `...codex` into the frozen result. Do not read `WORKBENCH_CODEX_ARGS`.

- [ ] **Step 5: Implement configurable client spawning**

Add constructor properties and validation:

```js
constructor({
  args = APP_SERVER_ARGS,
  command = APP_SERVER_COMMAND,
  cwd = process.cwd(),
  shell = process.platform === 'win32',
  spawnProcess = (launchCommand, launchArgs, options) => (
    spawn(launchCommand, launchArgs, options)
  ),
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  nonceFactory = () => crypto.randomBytes(32).toString('hex'),
} = {}) {
  super();
  if (typeof command !== 'string' || !command.trim()) {
    throw new TypeError('command must be a non-empty string');
  }
  if (!Array.isArray(args) || args.some(value => typeof value !== 'string')) {
    throw new TypeError('args must be an array of strings');
  }
  if (shell === false && process.platform === 'win32' && !path.win32.isAbsolute(command)) {
    throw new TypeError('shell:false command must be an absolute Windows path');
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new TypeError('requestTimeoutMs must be a positive integer');
  }
  this.command = command;
  this.args = Object.freeze([...args]);
  this.shell = Boolean(shell);
  this.cwd = cwd;
  this.spawnProcess = spawnProcess;
  this.requestTimeoutMs = requestTimeoutMs;
  this.nonceFactory = nonceFactory;
  this.processNonce = null;
  this.child = null;
  this.lines = null;
  this.nextId = 1;
  this.pending = new Map();
  this.stderrText = '';
  this.launchErrorText = '';
}
```

Import `node:path`. In `start()`, preserve the existing nonce-prefixed development wrapper only when `this.shell` is true, but launch portable mode directly:

```js
const launchCommand = this.shell
  ? `set "${PROCESS_NONCE_NAME}=${processNonce}" && `
    + `${this.command} ${this.args.join(' ')}`
  : this.command;
const launchArgs = this.shell ? [] : [...this.args];
child = this.spawnProcess(launchCommand, launchArgs, {
  cwd: this.cwd,
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
  shell: this.shell,
  env: {
    ...process.env,
    [PROCESS_NONCE_NAME]: processNonce,
  },
});
```

Return `this.command` and `this.args` from `diagnostics()`.

- [ ] **Step 6: Wire config through the server**

Replace the default client construction in `workbench/server.mjs` with:

```js
: new CodexAppServerClient({
    args: config.codexArgs,
    command: config.codexCommand,
    cwd: config.allowedRoot,
    nonceFactory: config.codexProcessNonce
      ? () => config.codexProcessNonce
      : undefined,
    shell: config.codexShell,
  });
```

- [ ] **Step 7: Update the old fixed-command assertions**

Keep the development launch assertions, and change only their description to say “development app-server command”. In `config-security.test.mjs`, add:

```js
assert.equal(config.codexShell, process.platform === 'win32');
assert.equal(config.codexProcessNonce, null);
```

- [ ] **Step 8: Run focused and full tests**

Run: `node --test test/workbench/portable-config.test.mjs test/workbench/codex-app-server-client.test.mjs test/workbench/config-security.test.mjs test/workbench/server.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all tests pass.

- [ ] **Step 9: Commit the portable Codex launch contract**

```powershell
git add -- workbench/lib/config.mjs workbench/lib/codex-app-server-client.mjs workbench/server.mjs test/workbench/config-security.test.mjs test/workbench/codex-app-server-client.test.mjs test/workbench/portable-config.test.mjs
git commit -m "feat: support portable Codex app server command"
```

### Task 3: Preserve nonce-safe crash recovery for direct `codex.exe`

**Files:**
- Modify: `workbench/lib/process-control.mjs`
- Modify: `test/workbench/process-control.test.mjs`
- Create: `workbench/portable/constants.mjs`
- Create: `workbench/portable/launcher-state.mjs`
- Create: `test/workbench/portable-launcher-state.test.mjs`

- [ ] **Step 1: Write failing direct-process ownership tests**

```js
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
});
```

- [ ] **Step 2: Write the failing nonce-junction test**

```js
// append to test/workbench/portable-launcher-state.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPortableCodexCommand } from '../../workbench/portable/launcher-state.mjs';

test('portable Codex command is an absolute nonce-bound junction path', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-codex-command-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const codexRoot = path.join(root, 'runtime', 'codex');
  fs.mkdirSync(codexRoot, { recursive: true });
  fs.writeFileSync(path.join(codexRoot, 'codex.exe'), 'fixture');
  const nonce = 'c'.repeat(64);

  const command = createPortableCodexCommand({
    codexRoot,
    nonce,
    runtimeRoot: path.join(root, 'runtime'),
  });

  assert.equal(path.isAbsolute(command), true);
  assert.equal(command, path.join(
    root,
    'runtime',
    'codex-sessions',
    nonce,
    'codex.exe',
  ));
  assert.equal(fs.realpathSync(command), fs.realpathSync(path.join(codexRoot, 'codex.exe')));
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run: `node --test test/workbench/process-control.test.mjs test/workbench/portable-launcher-state.test.mjs`

Expected: FAIL because direct nonce-path ownership and the launcher-state module do not exist.

- [ ] **Step 4: Add portable constants**

```js
// workbench/portable/constants.mjs
export const APP_DIRECTORY_NAME = 'PersonalCodexWorkbench';
export const EXE_FILENAME = '个人产品经理工作台.exe';
export const PAYLOAD_VERSION = '2026.07.28.1';
export const PROCESS_NONCE_PATTERN = /^[a-f0-9]{64}$/;
export const SEED_FILES = Object.freeze([
  Object.freeze({
    source: 'starter-workspace/docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
    target: 'docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
  }),
  Object.freeze({
    source: 'starter-workspace/demos/产品经理全生命周期工作台demo.html',
    target: 'demos/产品经理全生命周期工作台demo.html',
  }),
]);
```

- [ ] **Step 5: Implement nonce-bound junction creation**

```js
// initial workbench/portable/launcher-state.mjs
import fs from 'node:fs';
import path from 'node:path';
import { PROCESS_NONCE_PATTERN } from './constants.mjs';

export function createPortableCodexCommand({ codexRoot, nonce, runtimeRoot }) {
  if (!PROCESS_NONCE_PATTERN.test(String(nonce || ''))) {
    throw new Error('Portable Codex nonce must be 64 lowercase hexadecimal characters');
  }
  const resolvedRuntime = path.resolve(runtimeRoot);
  const resolvedCodex = path.resolve(codexRoot);
  const sessionsRoot = path.join(resolvedRuntime, 'codex-sessions');
  const sessionRoot = path.join(sessionsRoot, nonce);
  if (path.relative(resolvedRuntime, sessionRoot).startsWith('..')) {
    throw new Error('Portable Codex session path escaped runtime root');
  }
  fs.mkdirSync(sessionsRoot, { recursive: true });
  if (!fs.existsSync(sessionRoot)) {
    fs.symlinkSync(resolvedCodex, sessionRoot, 'junction');
  } else if (fs.realpathSync(sessionRoot) !== fs.realpathSync(resolvedCodex)) {
    throw new Error('Portable Codex session junction points to an unexpected target');
  }
  const command = path.join(sessionRoot, 'codex.exe');
  if (!fs.statSync(command).isFile()) {
    throw new Error('Portable codex.exe is missing');
  }
  return command;
}
```

- [ ] **Step 6: Extend ownership matching without accepting loose command lines**

Add this helper to `process-control.mjs`:

```js
function isNonceBoundPortableCommand(commandLine, processNonce) {
  const escapedNonce = String(processNonce).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    '^\\s*"?(?:[^"\\r\\n]*[\\\\/])?codex-sessions[\\\\/]'
      + `${escapedNonce}[\\\\/]codex\\.exe"?\\s+app-server\\s*$`,
    'i',
  );
  return pattern.test(String(commandLine || ''));
}
```

At the start of `isOwnedCodexAppServerProcess`, after nonce validation, add:

```js
if (
  executableName(executable).toLowerCase() === 'codex.exe'
  && isNonceBoundPortableCommand(commandLine, processNonce)
) {
  return true;
}
```

The existing `cmd.exe` nonce-prefix branch remains unchanged for development-mode recovery.

- [ ] **Step 7: Run focused and full tests**

Run: `node --test test/workbench/process-control.test.mjs test/workbench/portable-launcher-state.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all tests pass.

- [ ] **Step 8: Commit nonce-safe portable recovery**

```powershell
git add -- workbench/lib/process-control.mjs workbench/portable/constants.mjs workbench/portable/launcher-state.mjs test/workbench/process-control.test.mjs test/workbench/portable-launcher-state.test.mjs
git commit -m "feat: verify portable Codex recovery identity"
```

### Task 4: Build and verify the versioned runtime cache

**Files:**
- Create: `workbench/portable/sea-entry.cjs`
- Create: `test/workbench/portable-cache.test.mjs`

- [ ] **Step 1: Write failing manifest and cache tests**

```js
// test/workbench/portable-cache.test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  hashBuffer,
  hashFile,
  verifyRuntimeManifest,
  ensureRuntimeCache,
} = require('../../workbench/portable/sea-entry.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'expanded');
  fs.mkdirSync(path.join(source, 'workbench'), { recursive: true });
  fs.writeFileSync(path.join(source, 'workbench', 'server.mjs'), 'export const ok = true;\n');
  const file = path.join(source, 'workbench', 'server.mjs');
  const manifest = {
    payloadVersion: 'fixture-v1',
    files: [{
      bytes: fs.statSync(file).size,
      path: 'workbench/server.mjs',
      sha256: hashFile(file),
    }],
  };
  fs.writeFileSync(path.join(source, 'manifest.json'), JSON.stringify(manifest));
  return { manifest, root, source };
}

test('manifest verifies exact paths, sizes, and hashes', t => {
  const { manifest, source } = fixture(t);
  assert.doesNotThrow(() => verifyRuntimeManifest(source, manifest));
  fs.appendFileSync(path.join(source, 'workbench', 'server.mjs'), 'corrupt');
  assert.throws(() => verifyRuntimeManifest(source, manifest), /hash|size/i);
});

test('runtime cache reuses a valid target and rebuilds a corrupt target atomically', async t => {
  const { manifest, root, source } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  let extractionCount = 0;
  const expandArchive = async destination => {
    extractionCount += 1;
    fs.cpSync(source, destination, { recursive: true });
  };
  const first = await ensureRuntimeCache({
    archive: Buffer.from('fixture archive'),
    archiveSha256: hashBuffer(Buffer.from('fixture archive')),
    expandArchive,
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot,
  });
  const second = await ensureRuntimeCache({
    archive: Buffer.from('fixture archive'),
    archiveSha256: hashBuffer(Buffer.from('fixture archive')),
    expandArchive,
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot,
  });
  assert.equal(first, second);
  assert.equal(extractionCount, 1);

  fs.appendFileSync(path.join(first, 'workbench', 'server.mjs'), 'corrupt');
  const rebuilt = await ensureRuntimeCache({
    archive: Buffer.from('fixture archive'),
    archiveSha256: hashBuffer(Buffer.from('fixture archive')),
    expandArchive,
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot,
  });
  assert.equal(rebuilt, first);
  assert.equal(extractionCount, 2);
  assert.doesNotThrow(() => verifyRuntimeManifest(rebuilt, manifest));
});

test('failed expansion never becomes the version directory', async t => {
  const { manifest, root } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  await assert.rejects(
    () => ensureRuntimeCache({
      archive: Buffer.from('fixture archive'),
      archiveSha256: hashBuffer(Buffer.from('fixture archive')),
      expandArchive: async destination => {
        fs.mkdirSync(destination, { recursive: true });
        throw new Error('Expand-Archive failed');
      },
      manifest,
      payloadVersion: manifest.payloadVersion,
      runtimeRoot,
    }),
    /Expand-Archive failed/,
  );
  assert.equal(fs.existsSync(path.join(runtimeRoot, manifest.payloadVersion)), false);
});
```

- [ ] **Step 2: Run the cache tests and verify they fail**

Run: `node --test test/workbench/portable-cache.test.mjs`

Expected: FAIL because `sea-entry.cjs` does not exist.

- [ ] **Step 3: Implement hashing, manifest verification, and atomic extraction**

`workbench/portable/sea-entry.cjs` must export the tested functions and use only built-in modules before the payload is verified. The cache implementation must:

```js
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function hashBuffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashFile(filename) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filename));
  return hash.digest('hex');
}

function safePayloadPath(root, relativePath) {
  if (
    typeof relativePath !== 'string'
    || !relativePath
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
  ) {
    throw new Error(`Invalid manifest path: ${relativePath}`);
  }
  const candidate = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(path.resolve(root), candidate);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Manifest path escaped runtime root: ${relativePath}`);
  }
  return candidate;
}

function verifyRuntimeManifest(runtimePath, manifest) {
  if (!manifest || !Array.isArray(manifest.files) || !manifest.payloadVersion) {
    throw new Error('Runtime manifest is invalid');
  }
  for (const entry of manifest.files) {
    const filename = safePayloadPath(runtimePath, entry.path);
    const stat = fs.statSync(filename);
    if (!stat.isFile() || stat.size !== entry.bytes) {
      throw new Error(`Runtime file size mismatch: ${entry.path}`);
    }
    if (hashFile(filename) !== entry.sha256) {
      throw new Error(`Runtime file hash mismatch: ${entry.path}`);
    }
  }
}

async function ensureRuntimeCache({
  archive,
  archiveSha256,
  expandArchive,
  manifest,
  payloadVersion,
  runtimeRoot,
}) {
  if (!/^[a-zA-Z0-9._-]+$/.test(String(payloadVersion || ''))) {
    throw new Error('Payload version contains unsafe path characters');
  }
  if (hashBuffer(archive) !== archiveSha256) {
    throw new Error('Embedded runtime archive SHA-256 mismatch');
  }
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const target = path.join(resolvedRuntimeRoot, payloadVersion);
  if (fs.existsSync(target)) {
    try {
      verifyRuntimeManifest(target, manifest);
      return target;
    } catch {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
  const temporary = path.join(
    runtimeRoot,
    `.extract-${payloadVersion}-${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
  );
  try {
    await expandArchive(temporary, archive);
    verifyRuntimeManifest(temporary, manifest);
    try {
      fs.renameSync(temporary, target);
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      verifyRuntimeManifest(target, manifest);
    }
    return target;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

module.exports = {
  ensureRuntimeCache,
  hashBuffer,
  hashFile,
  safePayloadPath,
  verifyRuntimeManifest,
};
```

The executable branch added later in this task must obtain `runtime.zip` and `payload-meta.json` through `node:sea.getAsset()`, never through `require()`.

- [ ] **Step 4: Add the SEA executable branch**

Append a `runSea()` function that:

```js
async function runSea({
  getAsset = require('node:sea').getAsset,
  localAppData = process.env.LOCALAPPDATA,
} = {}) {
  if (!localAppData) throw new Error('LOCALAPPDATA is unavailable');
  const archive = Buffer.from(getAsset('runtime.zip'));
  const meta = JSON.parse(Buffer.from(getAsset('payload-meta.json')).toString('utf8'));
  const manifest = meta.manifest;
  const appRoot = path.join(localAppData, 'PersonalCodexWorkbench');
  const logPath = path.join(appRoot, 'launcher.log');
  const log = message => {
    fs.mkdirSync(appRoot, { recursive: true });
    fs.appendFileSync(
      logPath,
      `${new Date().toISOString()} INFO ${message}\n`,
      'utf8',
    );
  };
  const archiveFile = path.join(
    appRoot,
    `runtime-${manifest.payloadVersion}-${process.pid}.zip`,
  );
  const expandArchive = async destination => {
    fs.writeFileSync(archiveFile, archive, { flag: 'wx' });
    try {
      await new Promise((resolve, reject) => {
        const { execFile } = require('node:child_process');
        execFile(
          'powershell.exe',
          [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Expand-Archive -LiteralPath $env:WORKBENCH_ARCHIVE '
              + '-DestinationPath $env:WORKBENCH_DESTINATION -Force',
          ],
          {
            env: {
              ...process.env,
              WORKBENCH_ARCHIVE: archiveFile,
              WORKBENCH_DESTINATION: destination,
            },
            windowsHide: true,
          },
          error => (error ? reject(error) : resolve()),
        );
      });
    } finally {
      fs.rmSync(archiveFile, { force: true });
    }
  };
  const runtimePath = await ensureRuntimeCache({
    archive,
    archiveSha256: meta.archiveSha256,
    expandArchive,
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot: path.join(appRoot, 'runtime'),
  });
  log(`运行时校验通过：${manifest.payloadVersion}`);
  const launcherUrl = pathToFileURL(
    path.join(runtimePath, 'workbench', 'portable', 'launcher.mjs'),
  ).href;
  const { runPortableLauncher } = await import(launcherUrl);
  await runPortableLauncher({ appRoot, runtimePath });
}
```

Guard execution with:

```js
if (require.main === module) {
  runSea().catch(error => {
    console.error(`个人产品经理工作台启动失败：${error.message}`);
    console.error('详细日志：%LOCALAPPDATA%\\PersonalCodexWorkbench\\launcher.log');
    process.exitCode = 1;
  });
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/workbench/portable-cache.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all tests pass.

- [ ] **Step 6: Commit the runtime cache**

```powershell
git add -- workbench/portable/sea-entry.cjs test/workbench/portable-cache.test.mjs
git commit -m "feat: verify and extract portable runtime cache"
```

### Task 5: Implement first-run workspace, seed, login, and single-instance state

**Files:**
- Modify: `workbench/portable/launcher-state.mjs`
- Create: `workbench/portable/windows.mjs`
- Modify: `test/workbench/portable-launcher-state.test.mjs`

- [ ] **Step 1: Add failing state-management tests**

Add tests that use temporary directories and injected functions:

```js
import {
  acquireInstance,
  copyMissingSeeds,
  createLauncherLogger,
  loadWorkspace,
  releaseInstance,
  writeJsonAtomic,
} from '../../workbench/portable/launcher-state.mjs';

test('missing seeds are copied once and existing workspace files are never overwritten', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-seeds-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const runtimePath = path.join(root, 'runtime');
  const workspace = path.join(root, 'workspace');
  const source = path.join(runtimePath, 'starter-workspace', 'demo.txt');
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(source, 'seed');
  const mappings = [{ source: 'starter-workspace/demo.txt', target: 'demo.txt' }];

  assert.deepEqual(copyMissingSeeds({ mappings, runtimePath, workspace }), ['demo.txt']);
  fs.writeFileSync(path.join(workspace, 'demo.txt'), 'user content');
  assert.deepEqual(copyMissingSeeds({ mappings, runtimePath, workspace }), []);
  assert.equal(fs.readFileSync(path.join(workspace, 'demo.txt'), 'utf8'), 'user content');
});

test('cancelled selection returns null and does not create workspace data', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-workspace-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workspace = await loadWorkspace({
    appRoot: path.join(root, 'state'),
    chooseFolder: async () => null,
  });
  assert.equal(workspace, null);
  assert.equal(fs.existsSync(path.join(root, 'state', 'settings.json')), false);
});

test('instance reuse requires a healthy token response and ambiguous live PID fails closed', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-instance-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = {
    pid: 8123,
    port: 49123,
    token: 'd'.repeat(64),
    workspace: 'C:\\workspace',
    startedAt: new Date().toISOString(),
  };
  writeJsonAtomic(path.join(root, 'session.json'), session);
  fs.writeFileSync(path.join(root, 'instance.lock'), JSON.stringify({ pid: session.pid }));

  const reused = await acquireInstance({
    appRoot: root,
    checkHealth: async value => value.token === session.token,
    isPidAlive: () => true,
  });
  assert.equal(reused.status, 'reused');

  await assert.rejects(
    () => acquireInstance({
      appRoot: root,
      checkHealth: async () => false,
      isPidAlive: () => true,
    }),
    /仍在运行但健康检查失败/,
  );
});

test('launcher log records events without tokens or file contents', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-log-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const logger = createLauncherLogger(path.join(root, 'launcher.log'));
  logger.info('Broker 已启动', { port: 49123, workspace: 'C:\\workspace' });
  const content = fs.readFileSync(path.join(root, 'launcher.log'), 'utf8');
  assert.match(content, /Broker 已启动/);
  assert.match(content, /49123/);
  assert.doesNotMatch(content, /token|authorization|prompt|fileBody/i);
});
```

- [ ] **Step 2: Run the state tests and verify they fail**

Run: `node --test test/workbench/portable-launcher-state.test.mjs`

Expected: FAIL because the state-management exports do not exist.

- [ ] **Step 3: Implement atomic JSON, workspace checks, and seed copying**

Add these exact behaviors to `launcher-state.mjs`:

```js
export function writeJsonAtomic(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  fs.renameSync(temporary, filename);
}

export function assertWritableWorkspace(workspace) {
  const resolved = path.resolve(workspace);
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error('所选工作区不是文件夹');
  }
  const probe = path.join(
    resolved,
    `.personal-codex-workbench-write-${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
  );
  try {
    fs.writeFileSync(probe, 'write-test', { flag: 'wx' });
  } finally {
    fs.rmSync(probe, { force: true });
  }
  return resolved;
}

export async function loadWorkspace({ appRoot, chooseFolder }) {
  const settingsPath = path.join(appRoot, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return assertWritableWorkspace(saved.workspace);
    } catch {
      // Invalid settings intentionally return to the explicit chooser.
    }
  }
  const selected = await chooseFolder();
  if (!selected) return null;
  const workspace = assertWritableWorkspace(selected);
  writeJsonAtomic(settingsPath, { workspace });
  return workspace;
}

export function copyMissingSeeds({ mappings, runtimePath, workspace }) {
  const copied = [];
  for (const mapping of mappings) {
    const source = path.join(runtimePath, ...mapping.source.split('/'));
    const target = path.join(workspace, ...mapping.target.split('/'));
    if (fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    copied.push(mapping.target);
  }
  return copied;
}

export function createLauncherLogger(filename) {
  const write = (level, message, fields = {}) => {
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([key]) => (
        !['token', 'authorization', 'auth', 'prompt', 'fileBody'].includes(key)
      )),
    );
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.appendFileSync(
      filename,
      `${new Date().toISOString()} ${level} ${message} ${JSON.stringify(safeFields)}\n`,
      'utf8',
    );
  };
  return Object.freeze({
    error: (message, fields) => write('ERROR', message, fields),
    info: (message, fields) => write('INFO', message, fields),
  });
}
```

Import `crypto` in the module. No operation may create `.workbench-data` before `assertWritableWorkspace` succeeds.

- [ ] **Step 4: Implement single-instance acquisition and health verification**

Add:

```js
export async function checkBrokerHealth(session, fetchImpl = fetch) {
  if (
    !Number.isInteger(session?.port)
    || session.port < 1
    || session.port > 65535
    || !/^[a-f0-9]{64}$/.test(String(session?.token || ''))
  ) return false;
  const origin = `http://127.0.0.1:${session.port}`;
  try {
    const response = await fetchImpl(`${origin}/api/bootstrap`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        Origin: origin,
      },
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function acquireInstance({
  appRoot,
  checkHealth = checkBrokerHealth,
  isPidAlive = pid => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return error.code === 'EPERM';
    }
  },
}) {
  fs.mkdirSync(appRoot, { recursive: true });
  const lockPath = path.join(appRoot, 'instance.lock');
  const sessionPath = path.join(appRoot, 'session.json');
  try {
    const handle = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(handle, JSON.stringify({ pid: process.pid }));
    return { handle, lockPath, sessionPath, status: 'acquired' };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  let session;
  try {
    session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch {
    session = null;
  }
  if (session && await checkHealth(session)) {
    return { session, status: 'reused' };
  }
  if (Number.isInteger(session?.pid) && isPidAlive(session.pid)) {
    throw new Error('旧工作台进程仍在运行但健康检查失败；为避免接管错误进程，本次启动已停止');
  }
  fs.rmSync(lockPath, { force: true });
  fs.rmSync(sessionPath, { force: true });
  const handle = fs.openSync(lockPath, 'wx');
  fs.writeFileSync(handle, JSON.stringify({ pid: process.pid }));
  return { handle, lockPath, sessionPath, status: 'acquired' };
}

export function releaseInstance(instance) {
  if (instance?.handle !== undefined) fs.closeSync(instance.handle);
  if (instance?.sessionPath) fs.rmSync(instance.sessionPath, { force: true });
  if (instance?.lockPath) fs.rmSync(instance.lockPath, { force: true });
}
```

- [ ] **Step 5: Implement safe Windows integrations**

```js
// workbench/portable/windows.mjs
import { spawn } from 'node:child_process';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr?.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.once('error', reject);
    child.once('exit', code => (
      code === 0
        ? resolve({ code, stderr, stdout })
        : reject(Object.assign(new Error(stderr.trim() || `${command} exited ${code}`), { code }))
    ));
  });
}

export async function chooseWorkspaceFolder({ initialDirectory = '' } = {}) {
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
  const result = await run('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-STA',
    '-Command',
    script,
  ], {
    env: { ...process.env, WORKBENCH_INITIAL_DIRECTORY: initialDirectory },
  });
  const encoded = result.stdout.trim();
  return encoded ? Buffer.from(encoded, 'base64').toString('utf8') : null;
}

export async function ensureCodexLogin(codexCommand) {
  try {
    await run(codexCommand, ['login', 'status']);
    return;
  } catch {
    console.log('首次使用需要登录 Codex。登录完成后工作台会继续启动。');
  }
  await run(codexCommand, ['login'], {
    stdio: 'inherit',
    windowsHide: false,
  });
  await run(codexCommand, ['login', 'status']);
}

export async function openDefaultBrowser(url) {
  await run('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '[Diagnostics.Process]::Start($env:WORKBENCH_URL) | Out-Null',
  ], {
    env: { ...process.env, WORKBENCH_URL: url },
  });
}
```

The launcher log must record only event names, paths, port, and non-secret diagnostics. It must never receive the token, auth contents, prompts, or file bodies.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test test/workbench/portable-launcher-state.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all tests pass.

- [ ] **Step 7: Commit first-run state management**

```powershell
git add -- workbench/portable/launcher-state.mjs workbench/portable/windows.mjs test/workbench/portable-launcher-state.test.mjs
git commit -m "feat: add portable first run and instance state"
```

### Task 6: Orchestrate the portable Broker lifecycle

**Files:**
- Create: `workbench/portable/launcher.mjs`
- Create: `test/workbench/portable-launcher.test.mjs`

- [ ] **Step 1: Write failing launcher orchestration tests**

```js
// test/workbench/portable-launcher.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { runPortableLauncher } from '../../workbench/portable/launcher.mjs';

test('reused instance only opens its existing token URL', async () => {
  const opened = [];
  const session = { port: 48111, token: 'e'.repeat(64) };
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({ session, status: 'reused' }),
      createLauncherLogger: () => ({ info: () => {} }),
      openDefaultBrowser: async url => opened.push(url),
    },
  });
  assert.equal(result.status, 'reused');
  assert.deepEqual(opened, [
    `http://127.0.0.1:48111/?token=${session.token}`,
  ]);
});

test('cancelled workspace exits before login or Broker creation', async () => {
  let loginCount = 0;
  let serverCount = 0;
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({ status: 'acquired' }),
      createLauncherLogger: () => ({ info: () => {} }),
      loadWorkspace: async () => null,
      ensureCodexLogin: async () => { loginCount += 1; },
      createWorkbenchServer: async () => { serverCount += 1; },
      releaseInstance: () => {},
    },
  });
  assert.equal(result.status, 'cancelled');
  assert.equal(loginCount, 0);
  assert.equal(serverCount, 0);
});
```

- [ ] **Step 2: Run the launcher tests and verify they fail**

Run: `node --test test/workbench/portable-launcher.test.mjs`

Expected: FAIL because `launcher.mjs` does not exist.

- [ ] **Step 3: Implement launcher orchestration with injectable boundaries**

`runPortableLauncher` must merge production dependencies with test overrides, then execute this order:

```js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createWorkbenchServer } from '../server.mjs';
import { SEED_FILES } from './constants.mjs';
import {
  acquireInstance,
  copyMissingSeeds,
  createLauncherLogger,
  createPortableCodexCommand,
  loadWorkspace,
  releaseInstance,
  writeJsonAtomic,
} from './launcher-state.mjs';
import {
  chooseWorkspaceFolder,
  ensureCodexLogin,
  openDefaultBrowser,
} from './windows.mjs';

export async function runPortableLauncher({
  appRoot,
  runtimePath,
  dependencies: overrides = {},
}) {
  const dependencies = {
    acquireInstance,
    chooseWorkspaceFolder,
    copyMissingSeeds,
      createPortableCodexCommand,
      createWorkbenchServer,
      createLauncherLogger,
      ensureCodexLogin,
      loadWorkspace,
      openDefaultBrowser,
      releaseInstance,
      waitForShutdown,
      writeJsonAtomic,
    ...overrides,
  };
  const logger = dependencies.createLauncherLogger(path.join(appRoot, 'launcher.log'));
  const instance = await dependencies.acquireInstance({ appRoot });
  if (instance.status === 'reused') {
    const url = sessionUrl(instance.session);
    await dependencies.openDefaultBrowser(url);
    logger.info('复用现有 Broker', { port: instance.session.port });
    return { status: 'reused', url };
  }

  let app = null;
  let completed = false;
  try {
    const workspace = await dependencies.loadWorkspace({
      appRoot,
      chooseFolder: () => {
        const executableDirectory = path.dirname(process.execPath);
        const initialDirectory = (
          fs.existsSync(path.join(executableDirectory, '.workbench-data'))
          && fs.existsSync(path.join(executableDirectory, 'workbench'))
        )
          ? executableDirectory
          : '';
        return dependencies.chooseWorkspaceFolder({ initialDirectory });
      },
    });
    if (!workspace) {
      completed = true;
      dependencies.releaseInstance(instance);
      return { status: 'cancelled' };
    }
    logger.info('工作区已确认', { workspace });
    dependencies.copyMissingSeeds({
      mappings: SEED_FILES,
      runtimePath,
      workspace,
    });
    logger.info('种子文件检查完成', { workspace });
    const nonce = crypto.randomBytes(32).toString('hex');
    const codexRoot = path.join(runtimePath, 'codex');
    const codexCommand = dependencies.createPortableCodexCommand({
      codexRoot,
      nonce,
      runtimeRoot: runtimePath,
    });
    await dependencies.ensureCodexLogin(path.join(codexRoot, 'codex.exe'));
    logger.info('Codex 登录状态检查通过');
    app = await dependencies.createWorkbenchServer({
      env: {
        ...process.env,
        WORKBENCH_CODEX_COMMAND: codexCommand,
        WORKBENCH_CODEX_NONCE: nonce,
        WORKBENCH_PORT: '0',
        WORKBENCH_ROOT: workspace,
      },
    });
    await app.listen();
    const port = app.address().port;
    const session = {
      pid: process.pid,
      port,
      startedAt: new Date().toISOString(),
      token: app.config.sessionToken,
      workspace,
    };
    dependencies.writeJsonAtomic(instance.sessionPath, session);
    logger.info('Broker 已启动', { port, workspace });
    const url = sessionUrl(session);
    try {
      await dependencies.openDefaultBrowser(url);
      logger.info('浏览器已打开', { port });
    } catch {
      logger.error('浏览器自动打开失败', { port });
      console.log(`浏览器未能自动打开，请复制此地址：${url}`);
    }
    console.log('个人产品经理工作台已启动');
    console.log('关闭此窗口或按 Ctrl+C 将停止本地服务');
    await dependencies.waitForShutdown();
    await app.close();
    app = null;
    dependencies.releaseInstance(instance);
    logger.info('Broker 已停止', { port });
    completed = true;
    return { status: 'stopped' };
  } finally {
    if (!completed) {
      if (app) await app.close();
      dependencies.releaseInstance(instance);
    }
  }
}
```

Define `sessionUrl` as:

```js
function sessionUrl(session) {
  return `http://127.0.0.1:${session.port}/?token=${encodeURIComponent(session.token)}`;
}
```

Define `waitForShutdown` with one-shot `SIGINT`, `SIGTERM`, and `SIGHUP` listeners and remove the other listeners after the first signal. Import `createWorkbenchServer` with a normal relative ESM import; SEA loads this module only after verified extraction.

- [ ] **Step 4: Add login failure and shutdown tests**

Add these two exact tests with fake dependencies whose counters are incremented by their corresponding functions:

```js
test('login failure releases the instance and never starts the Broker', async () => {
  let listenCount = 0;
  let releaseCount = 0;
  await assert.rejects(
    () => runPortableLauncher({
      appRoot: 'C:\\state',
      runtimePath: 'C:\\runtime',
      dependencies: {
        acquireInstance: async () => ({
          handle: 1,
          lockPath: 'C:\\state\\instance.lock',
          sessionPath: 'C:\\state\\session.json',
          status: 'acquired',
        }),
        loadWorkspace: async () => 'C:\\workspace',
        copyMissingSeeds: () => [],
        createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
        ensureCodexLogin: async () => { throw new Error('login failed'); },
        createWorkbenchServer: async () => ({
          listen: async () => { listenCount += 1; },
        }),
        createLauncherLogger: () => ({ info: () => {} }),
        releaseInstance: () => { releaseCount += 1; },
      },
    }),
    /login failed/,
  );
  assert.equal(listenCount, 0);
  assert.equal(releaseCount, 1);
});

test('shutdown closes Broker once, saves dynamic port, and releases the instance', async () => {
  let closeCount = 0;
  let releaseCount = 0;
  let savedSession;
  const token = 'f'.repeat(64);
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({
        handle: 1,
        lockPath: 'C:\\state\\instance.lock',
        sessionPath: 'C:\\state\\session.json',
        status: 'acquired',
      }),
      loadWorkspace: async () => 'C:\\workspace',
      copyMissingSeeds: () => [],
      createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
      ensureCodexLogin: async () => {},
      createWorkbenchServer: async () => ({
        address: () => ({ port: 48222 }),
        close: async () => { closeCount += 1; },
        config: { sessionToken: token },
        listen: async () => {},
      }),
      createLauncherLogger: () => ({ info: () => {} }),
      openDefaultBrowser: async () => {},
      releaseInstance: () => { releaseCount += 1; },
      waitForShutdown: async () => {},
      writeJsonAtomic: (_filename, value) => { savedSession = value; },
    },
  });
  assert.equal(result.status, 'stopped');
  assert.equal(closeCount, 1);
  assert.equal(releaseCount, 1);
  assert.equal(savedSession.port, 48222);
  assert.match(savedSession.token, /^[a-f0-9]{64}$/);
});
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --test test/workbench/portable-launcher.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:test`

Expected: all tests pass and no handle remains open after tests.

- [ ] **Step 6: Commit the launcher lifecycle**

```powershell
git add -- workbench/portable/launcher.mjs test/workbench/portable-launcher.test.mjs
git commit -m "feat: orchestrate portable workbench lifecycle"
```

### Task 7: Build the SEA from an explicit payload allowlist

**Files:**
- Create: `tools/build-portable-workbench.mjs`
- Modify: `test/workbench/portable-build.test.mjs`

- [ ] **Step 1: Add failing payload allowlist and manifest tests**

```js
import {
  buildManifest,
  payloadSources,
  validateBuildEnvironment,
} from '../../tools/build-portable-workbench.mjs';

test('portable payload uses an explicit allowlist and excludes user state', () => {
  const sources = payloadSources();
  assert.deepEqual(sources.map(value => value.target), [
    'workbench',
    'starter-workspace/docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
    'starter-workspace/demos/产品经理全生命周期工作台demo.html',
  ]);
  assert.equal(
    sources.some(value => /auth\.json|\.workbench-data/i.test(value.source)),
    false,
  );
});

test('manifest is sorted and contains exact hashes without self-inclusion', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'b'));
  fs.writeFileSync(path.join(root, 'b', 'two.txt'), 'two');
  fs.writeFileSync(path.join(root, 'one.txt'), 'one');
  const manifest = buildManifest({
    codexVersion: '0.130.0',
    payloadRoot: root,
    payloadVersion: 'fixture',
    sourceCommit: 'abc123',
  });
  assert.deepEqual(manifest.files.map(value => value.path), [
    'b/two.txt',
    'one.txt',
  ]);
  assert.equal(manifest.files.every(value => /^[a-f0-9]{64}$/.test(value.sha256)), true);
});
```

- [ ] **Step 2: Run the build tests and verify they fail**

Run: `node --test test/workbench/portable-build.test.mjs`

Expected: FAIL because the build module does not exist.

- [ ] **Step 3: Implement build environment validation and payload staging**

The build module must export pure helpers without running a build on import:

```js
export function validateBuildEnvironment() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Portable workbench must be built on Windows x64');
  }
  if (process.version !== 'v24.12.0') {
    throw new Error(`Node v24.12.0 is required; current version is ${process.version}`);
  }
}

export function payloadSources() {
  return [
    { source: 'workbench', target: 'workbench' },
    {
      source: 'docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
      target: 'starter-workspace/docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
    },
    {
      source: 'demos/产品经理全生命周期工作台demo.html',
      target: 'starter-workspace/demos/产品经理全生命周期工作台demo.html',
    },
  ];
}
```

Resolve Codex binaries only from the local pinned package:

```js
const codexPackage = createRequire(import.meta.url).resolve('@openai/codex/package.json');
const nativePackage = createRequire(import.meta.url).resolve('@openai/codex-win32-x64/package.json', {
  paths: [path.dirname(codexPackage)],
});
const vendorRoot = path.join(
  path.dirname(nativePackage),
  'vendor',
  'x86_64-pc-windows-msvc',
);
```

Copy exactly:

```text
vendor/x86_64-pc-windows-msvc/codex/codex.exe
vendor/x86_64-pc-windows-msvc/codex/codex-windows-sandbox-setup.exe
vendor/x86_64-pc-windows-msvc/codex/codex-command-runner.exe
vendor/x86_64-pc-windows-msvc/path/rg.exe
```

to `payload/codex/`. Do not recursively copy the package, home directory, workspace, `.codex`, or `.workbench-data`.

- [ ] **Step 4: Implement sorted manifest generation**

```js
export function buildManifest({
  codexVersion,
  payloadRoot,
  payloadVersion,
  sourceCommit,
}) {
  const files = walkFiles(payloadRoot)
    .filter(filename => path.basename(filename) !== 'manifest.json')
    .map(filename => {
      const relative = path.relative(payloadRoot, filename).split(path.sep).join('/');
      return {
        bytes: fs.statSync(filename).size,
        path: relative,
        sha256: sha256File(filename),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
  return {
    codexVersion,
    createdAt: new Date().toISOString(),
    files,
    nodeVersion: process.version,
    payloadVersion,
    sourceCommit,
  };
}
```

`walkFiles` must recursively include regular files, reject symbolic links, and sort each directory before recursion.

- [ ] **Step 5: Implement ZIP, SEA config, and postject injection**

The executable `main()` must:

1. Remove only the resolved `build/portable` directory and recreate it.
2. Stage the allowlisted payload and native Codex files.
3. Write `payload/manifest.json`.
4. Run `Compress-Archive` with source `payload/*` and output `runtime.zip`.
5. Write `payload-meta.json` containing `archiveSha256` and the complete manifest.
6. Write `sea-config.json`:

```json
{
  "main": "workbench/portable/sea-entry.cjs",
  "output": "build/portable/sea-preparation.blob",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": false,
  "useSnapshot": false,
  "assets": {
    "runtime.zip": "build/portable/runtime.zip",
    "payload-meta.json": "build/portable/payload-meta.json"
  }
}
```

Use absolute paths in the generated JSON so the build does not depend on the caller’s current directory. Then run:

```js
await execFile(process.execPath, ['--experimental-sea-config', seaConfigPath]);
fs.copyFileSync(process.execPath, outputExe);
await execFile(process.execPath, [
  require.resolve('postject/dist/cli.js'),
  outputExe,
  'NODE_SEA_BLOB',
  seaBlobPath,
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
]);
```

Finally enforce:

```js
const maxBytes = 400 * 1024 * 1024;
if (fs.statSync(outputExe).size > maxBytes) {
  throw new Error('Portable EXE exceeds the 400 MB limit');
}
```

Write:

- `dist/个人产品经理工作台.exe`
- `dist/个人产品经理工作台.exe.sha256`
- `dist/portable-build-manifest.json`

The latter records EXE bytes/SHA-256, archive SHA-256, payload manifest, source commit, pinned dependency versions, and `signed:false`.

- [ ] **Step 6: Guard the executable entry**

At the bottom:

```js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 7: Run unit tests and create the first real EXE**

Run: `node --test test/workbench/portable-build.test.mjs`

Expected: PASS.

Run: `npm.cmd run workbench:build-portable`

Expected: the three `dist` artifacts are created, the EXE is below 400 MB, and the console prints its SHA-256 without exposing credentials.

- [ ] **Step 8: Inspect staged payload boundaries**

Run:

```powershell
rg -n -i "auth\.json|\.workbench-data" build/portable/payload/manifest.json
```

Expected: no matches.

Run:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'dist\个人产品经理工作台.exe'
```

Expected: the hash exactly matches `dist/个人产品经理工作台.exe.sha256`.

- [ ] **Step 9: Commit the build pipeline**

```powershell
git add -- tools/build-portable-workbench.mjs test/workbench/portable-build.test.mjs
git commit -m "build: create portable workbench SEA"
```

Do not commit `build/portable`, the EXE, or other large generated artifacts unless the repository’s existing artifact policy explicitly tracks `dist`.

### Task 8: Verify the real EXE, Codex workflows, reuse, and cache recovery

**Files:**
- Create: `tools/verify-portable-workbench.mjs`
- Modify: `tools/verify-personal-codex-workbench-real.mjs`
- Create: `test-results/personal-codex-workbench/portable-exe-results.json`
- Create: `docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md`

- [ ] **Step 1: Add an external-session adapter without changing scenario assertions**

At the top of `tools/verify-personal-codex-workbench-real.mjs`, replace the fixed workspace/evidence constants with:

```js
const externalSession = process.env.WORKBENCH_VERIFY_SESSION_JSON
  ? JSON.parse(process.env.WORKBENCH_VERIFY_SESSION_JSON)
  : null;
const workspaceRoot = path.resolve(
  process.env.WORKBENCH_VERIFY_WORKSPACE
    || path.resolve(import.meta.dirname, '..'),
);
const evidencePath = path.resolve(
  process.env.WORKBENCH_VERIFY_EVIDENCE
    || path.join(
      workspaceRoot,
      'test-results',
      'personal-codex-workbench',
      'real-integration-results.json',
    ),
);
```

Replace the Codex version expression with:

```js
const codexVersion = externalSession
  ? String(process.env.WORKBENCH_VERIFY_CODEX_VERSION || 'portable Codex 0.130.0')
  : process.platform === 'win32'
    ? execFileSync('cmd.exe', ['/d', '/s', '/c', 'codex.cmd --version'], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
      }).trim()
    : execFileSync('codex.cmd', ['--version'], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
      }).trim();
```

Replace the direct server construction with:

```js
const app = externalSession
  ? {
      address: () => ({ port: externalSession.port }),
      close: async () => {},
      config: {
        originForPort: port => `http://127.0.0.1:${port}`,
        sessionToken: externalSession.token,
      },
      listen: async () => {},
    }
  : await createWorkbenchServer({
      env: {
        ...process.env,
        WORKBENCH_PORT: '0',
        WORKBENCH_ROOT: workspaceRoot,
      },
    });
```

All existing bootstrap, read-only Run, three Workflow, isolated write, restore, and protected-file assertions remain in the same execution path. The default command uses the direct server; only `WORKBENCH_VERIFY_SESSION_JSON` activates the built-EXE adapter.

- [ ] **Step 2: Implement portable smoke setup with no global developer tools on PATH**

`tools/verify-portable-workbench.mjs` must:

```js
const cleanPath = [
  process.env.SystemRoot,
  path.join(process.env.SystemRoot, 'System32'),
  path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
].join(path.delimiter);
```

Create temporary `LOCALAPPDATA` and workspace directories, prewrite only:

```json
{
  "workspace": "<absolute temporary workspace>"
}
```

Launch the EXE with:

```js
spawn(exePath, [], {
  cwd: workspace,
  env: {
    LOCALAPPDATA: localAppData,
    PATH: cleanPath,
    SystemRoot: process.env.SystemRoot,
    USERPROFILE: process.env.USERPROFILE
  },
  shell: false,
  stdio: ['ignore', 'pipe', 'pipe']
});
```

Poll `session.json` for at most 60 seconds, validate PID/port/token shape, and call `/api/bootstrap` with exact Origin and Bearer headers.

- [ ] **Step 3: Verify EXE behavior through its HTTP boundary**

Run the existing scenario verifier as a test harness against the external session:

```js
await execFile(process.execPath, [
  path.join(repositoryRoot, 'tools', 'verify-personal-codex-workbench-real.mjs'),
], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    WORKBENCH_VERIFY_CODEX_VERSION: 'codex-cli 0.130.0 (portable)',
    WORKBENCH_VERIFY_EVIDENCE: portableScenarioEvidence,
    WORKBENCH_VERIFY_SESSION_JSON: JSON.stringify(firstSession),
    WORKBENCH_VERIFY_WORKSPACE: workspace,
  },
});
const scenarios = JSON.parse(fs.readFileSync(portableScenarioEvidence, 'utf8'));
assert.equal(scenarios.status, 'passed');
```

Assert:

- read-only Run completes;
- all three Workflow IDs complete;
- isolated write produces the expected candidate;
- restore returns the workspace to its pre-run state;
- the final candidate passes the existing workbench recovery check.

The verifier must inspect the launched process tree and assert no command line contains global `node.exe`, `npm.cmd`, or `%APPDATA%\npm\codex.cmd`. The expected Codex command line contains the extracted absolute `codex-sessions\<nonce>\codex.exe app-server` path.

- [ ] **Step 4: Verify duplicate launch and graceful shutdown**

Launch the same EXE a second time with the same environment. Assert:

```js
assert.equal(secondExit.code, 0);
assert.equal(readSession().pid, firstSession.pid);
assert.equal(await countListeningBrokers(firstSession.port), 1);
```

Send the first process `SIGTERM`, wait for exit, and assert the Broker port closes and `session.json`/`instance.lock` are removed.

- [ ] **Step 5: Verify corrupt-cache recovery**

After graceful shutdown, append one byte to the extracted `workbench/server.mjs`. Relaunch the EXE and assert:

```js
assert.equal(
  sha256File(extractedServer),
  manifest.files.find(value => value.path === 'workbench/server.mjs').sha256,
);
```

This proves the invalid version directory was discarded and rebuilt from the signed-by-hash SEA asset rather than executed.

- [ ] **Step 6: Emit machine-readable and human-readable evidence**

Write `test-results/personal-codex-workbench/portable-exe-results.json` with:

```json
{
  "artifact": {
    "path": "dist/个人产品经理工作台.exe",
    "bytes": 0,
    "sha256": "<64 lowercase hex>",
    "signed": false
  },
  "environment": {
    "platform": "win32",
    "arch": "x64",
    "nodeOnTestPath": false,
    "npmOnTestPath": false,
    "globalCodexOnTestPath": false
  },
  "checks": {
    "assetExtraction": "pass",
    "manifestVerification": "pass",
    "realCodexReadOnly": "pass",
    "threeWorkflows": "pass",
    "isolatedWriteRestore": "pass",
    "duplicateLaunchReuse": "pass",
    "corruptCacheRecovery": "pass",
    "gracefulShutdown": "pass"
  },
  "cleanWindowsMachine": "not-tested"
}
```

Fill numeric/hash values from the actual artifact. The Markdown report must state:

- current machine validation result;
- clean Windows machine status;
- first login requires networking;
- the EXE is unsigned and may trigger SmartScreen;
- the distributed file is one EXE, while runtime cache and user data are created after launch;
- no user credential, `.workbench-data`, or unrelated workspace document was packaged.

- [ ] **Step 7: Run all automated and real verification**

Run: `npm.cmd run workbench:test`

Expected: all old and new tests pass.

Run: `npm.cmd run workbench:verify-ui`

Expected: PASS.

Run: `npm.cmd run workbench:verify-real`

Expected: read-only, three workflows, isolated write, restore, and candidate checks PASS.

Run: `npm.cmd run workbench:verify-portable`

Expected: every portable check is PASS and the evidence JSON is written.

- [ ] **Step 8: Commit verification source and evidence**

```powershell
git add -- tools/verify-portable-workbench.mjs tools/verify-personal-codex-workbench-real.mjs test-results/personal-codex-workbench/portable-exe-results.json docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md
git commit -m "test: verify portable workbench executable"
```

### Task 9: Final artifact audit and handoff

**Files:**
- Verify: `dist/个人产品经理工作台.exe`
- Verify: `dist/个人产品经理工作台.exe.sha256`
- Verify: `dist/portable-build-manifest.json`
- Verify: `docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md`

- [ ] **Step 1: Verify source status without touching unrelated user changes**

Run:

```powershell
git status --short -- package.json package-lock.json workbench tools/build-portable-workbench.mjs tools/verify-portable-workbench.mjs test/workbench docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md
```

Expected: no uncommitted task-source changes remain. Unrelated dirty workspace files are preserved.

- [ ] **Step 2: Rebuild from the committed source state**

Run: `npm.cmd run workbench:build-portable`

Expected: build succeeds and `dist/portable-build-manifest.json` records the current task commit.

- [ ] **Step 3: Repeat the portable verifier against the rebuilt EXE**

Run: `npm.cmd run workbench:verify-portable`

Expected: PASS with the same functional checks. ZIP byte hashes may change because `Compress-Archive` timestamps entries; source commit, payload file hashes, pinned versions, and the final EXE hash explain the produced artifact.

- [ ] **Step 4: Confirm artifact size and checksum**

Run:

```powershell
$exe = Get-Item -LiteralPath 'dist\个人产品经理工作台.exe'
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $exe.FullName).Hash.ToLowerInvariant()
[pscustomobject]@{ Path = $exe.FullName; Bytes = $exe.Length; MiB = [math]::Round($exe.Length / 1MB, 2); SHA256 = $hash }
```

Expected: `MiB` is below 400 and SHA-256 matches both generated metadata files.

- [ ] **Step 5: Deliver with an explicit certification boundary**

The handoff must provide the clickable absolute EXE path, size, SHA-256, test totals, real Codex result, duplicate/cache recovery result, and SmartScreen warning. If no clean Windows 10/11 x64 VM was available, state exactly “当前机器已验证，干净机待验证”; do not describe the EXE as cross-machine certified.
