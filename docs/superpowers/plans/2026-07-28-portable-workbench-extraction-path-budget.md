# Portable Workbench Extraction Path Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single-file personal product-manager workbench EXE reliably extract and start when `%LOCALAPPDATA%` produces a Windows path at or beyond the PowerShell 5.1 `Expand-Archive` boundary.

**Architecture:** Keep the existing SEA archive, SHA-256 verification, per-file Manifest verification, versioned cache and atomic rename flow. Shorten only the unpublished extraction directory leaf, and isolate PowerShell expansion in a testable helper that promotes `Expand-Archive` non-terminating errors to process failures with `-ErrorAction Stop`.

**Tech Stack:** Node.js 24.12.0 SEA, CommonJS, Node built-ins (`child_process`, `crypto`, `fs`, `path`), Windows PowerShell 5.1 `Expand-Archive`, Node test runner, existing portable EXE verifier.

---

## File map

- Modify `workbench/portable/sea-entry.cjs`: create short extraction paths, expose a testable PowerShell expansion helper, and preserve existing cleanup and verification behavior.
- Modify `test/workbench/portable-cache.test.mjs`: add deterministic path-budget and PowerShell error-propagation regression tests.
- Rebuild `dist/个人产品经理工作台.exe`: regenerate the unsigned single-file artifact from the fixed source commit.
- Regenerate `dist/个人产品经理工作台.exe.sha256`: record the final artifact checksum.
- Regenerate `dist/portable-build-manifest.json`: record the final source commit, payload, size and SHA-256.
- Regenerate `test-results/personal-codex-workbench/portable-exe-results.json`: store machine-readable real EXE verification evidence.
- Create `docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md`: summarize automated and real verification, artifact identity and the clean-machine limitation.

### Task 1: Add failing extraction-path and PowerShell regression tests

**Files:**
- Modify: `test/workbench/portable-cache.test.mjs`
- Test: `test/workbench/portable-cache.test.mjs`

- [ ] **Step 1: Import the two new public helpers**

Change the CommonJS destructuring near the top of `test/workbench/portable-cache.test.mjs` to:

```js
const {
  createTemporaryArchivePath,
  createTemporaryRuntimePath,
  ensureRuntimeCache,
  expandRuntimeArchive,
  hashBuffer,
  hashFile,
  verifyRuntimeManifest,
  verifyRuntimeManifestWithRetry,
  writeStartupFailure,
} = require('../../workbench/portable/sea-entry.cjs');
```

- [ ] **Step 2: Write the deterministic short-path test**

Append this test after the existing temporary archive naming test:

```js
test('temporary runtime paths are unique and omit the long payload version', () => {
  const runtimeRoot = 'C:\\state\\runtime';
  const payloadVersion = 'v1-6d294fbc6efa-47dc68b9633c410f';
  const first = createTemporaryRuntimePath(runtimeRoot, {
    pid: 1234,
    randomBytes: () => Buffer.from('0011223344556677', 'hex'),
  });
  const second = createTemporaryRuntimePath(runtimeRoot, {
    pid: 1234,
    randomBytes: () => Buffer.from('8899aabbccddeeff', 'hex'),
  });

  assert.equal(path.dirname(first), path.resolve(runtimeRoot));
  assert.equal(
    path.basename(first),
    '.x-1234-0011223344556677',
  );
  assert.equal(path.basename(first).includes(payloadVersion), false);
  assert(path.basename(first).length <= 32);
  assert.notEqual(first, second);
});
```

- [ ] **Step 3: Write the PowerShell argument and cleanup test**

Append this test after the short-path test:

```js
test('PowerShell expansion promotes non-terminating errors and removes its ZIP', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archive = Buffer.from('fixture archive');
  const archiveFile = path.join(root, 'runtime.zip');
  const destination = path.join(root, 'destination');
  const calls = [];

  await expandRuntimeArchive({
    archive,
    archiveFile,
    destination,
    execFile: (command, args, options, callback) => {
      calls.push({ args, command, options });
      callback(null);
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'powershell.exe');
  assert.deepEqual(calls[0].args, [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Expand-Archive -LiteralPath $env:WORKBENCH_ARCHIVE '
      + '-DestinationPath $env:WORKBENCH_DESTINATION -Force '
      + '-ErrorAction Stop',
  ]);
  assert.equal(
    calls[0].options.env.WORKBENCH_ARCHIVE,
    archiveFile,
  );
  assert.equal(
    calls[0].options.env.WORKBENCH_DESTINATION,
    destination,
  );
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(fs.existsSync(archiveFile), false);
});
```

- [ ] **Step 4: Run the focused tests and verify they fail for the expected reason**

Run:

```powershell
node --test test/workbench/portable-cache.test.mjs
```

Expected: FAIL because `createTemporaryRuntimePath` and `expandRuntimeArchive` are not exported functions. Existing cache tests must continue to pass.

### Task 2: Implement the minimal path-budget fix

**Files:**
- Modify: `workbench/portable/sea-entry.cjs`
- Test: `test/workbench/portable-cache.test.mjs`

- [ ] **Step 1: Add the short temporary runtime path helper**

Add this function after `createTemporaryArchivePath`:

```js
function createTemporaryRuntimePath(
  runtimeRoot,
  {
    pid = process.pid,
    randomBytes = crypto.randomBytes,
  } = {},
) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error('Runtime extraction PID is invalid');
  }
  const nonce = randomBytes(8).toString('hex');
  if (!/^[a-f0-9]{16}$/.test(nonce)) {
    throw new Error('Runtime extraction nonce is invalid');
  }
  return path.join(
    path.resolve(runtimeRoot),
    `.x-${pid}-${nonce}`,
  );
}
```

- [ ] **Step 2: Use the helper inside `ensureRuntimeCache`**

Replace:

```js
const temporary = path.join(
  resolvedRuntimeRoot,
  `.extract-${payloadVersion}-${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
);
```

with:

```js
const temporary = createTemporaryRuntimePath(resolvedRuntimeRoot);
```

The version remains enforced by `manifest.payloadVersion`, `payloadVersion` validation and the final `target` path.

- [ ] **Step 3: Extract the PowerShell operation into a testable helper**

Add this function before `runSea`:

```js
async function expandRuntimeArchive({
  archive,
  archiveFile,
  destination,
  execFile = require('node:child_process').execFile,
}) {
  fs.writeFileSync(archiveFile, archive, { flag: 'wx' });
  try {
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Expand-Archive -LiteralPath $env:WORKBENCH_ARCHIVE '
            + '-DestinationPath $env:WORKBENCH_DESTINATION -Force '
            + '-ErrorAction Stop',
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
}
```

- [ ] **Step 4: Route `runSea` through the helper**

Replace the inline `expandArchive` implementation with:

```js
const expandArchive = destination => expandRuntimeArchive({
  archive,
  archiveFile,
  destination,
});
```

- [ ] **Step 5: Export the new helpers**

Update `module.exports` to include:

```js
module.exports = {
  createTemporaryArchivePath,
  createTemporaryRuntimePath,
  ensureRuntimeCache,
  expandRuntimeArchive,
  hashBuffer,
  hashFile,
  runSea,
  safePayloadPath,
  verifyRuntimeManifest,
  verifyRuntimeManifestWithRetry,
  writeStartupFailure,
};
```

- [ ] **Step 6: Run the focused cache tests**

Run:

```powershell
node --test test/workbench/portable-cache.test.mjs
```

Expected: all portable cache tests PASS; Windows symbolic-link tests may skip only when the current account lacks symlink permission.

- [ ] **Step 7: Run the complete workbench suite**

Run:

```powershell
npm.cmd run workbench:test
```

Expected: 0 failures. The prior baseline was 191 tests: 189 passed and 2 skipped for Windows symbolic-link permissions; the two new tests increase the total to at least 193.

- [ ] **Step 8: Commit only the focused source and tests**

Run:

```powershell
git add -- workbench/portable/sea-entry.cjs test/workbench/portable-cache.test.mjs
git diff --cached --check
git commit -m "fix: shorten portable extraction paths"
```

Expected: one commit containing only the two listed files. Do not stage or alter unrelated dirty-worktree files.

### Task 3: Rebuild and run the real portable EXE acceptance suite

**Files:**
- Regenerate: `dist/个人产品经理工作台.exe`
- Regenerate: `dist/个人产品经理工作台.exe.sha256`
- Regenerate: `dist/portable-build-manifest.json`
- Regenerate: `test-results/personal-codex-workbench/portable-exe-results.json`

- [ ] **Step 1: Build from the focused fix commit**

Run:

```powershell
npm.cmd run workbench:build-portable
```

Expected:

- `dist/个人产品经理工作台.exe` exists.
- Size is no more than 400 MB.
- Manifest dependencies remain Node `v24.12.0`, Codex `0.130.0`, postject `1.0.0-alpha.6`.
- `sourceCommit` and `payload.sourceCommit` equal the focused fix commit.
- Artifact remains unsigned.

- [ ] **Step 2: Cross-check the artifact against its manifest**

Run:

```powershell
$manifest = Get-Content -LiteralPath 'dist\portable-build-manifest.json' -Raw | ConvertFrom-Json
$exe = Get-Item -LiteralPath 'dist\个人产品经理工作台.exe'
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $exe.FullName).Hash.ToLowerInvariant()
[pscustomobject]@{
  BytesMatch = $exe.Length -eq $manifest.artifact.bytes
  HashMatch = $hash -eq $manifest.artifact.sha256
  Signed = $manifest.artifact.signed
  SourceCommit = $manifest.sourceCommit
}
```

Expected: `BytesMatch=True`, `HashMatch=True`, `Signed=False`, and `SourceCommit` is the focused fix commit.

- [ ] **Step 3: Run the full portable verifier**

Run:

```powershell
npm.cmd run workbench:verify-portable
```

Expected:

```text
Portable verification PASS: ...\test-results\personal-codex-workbench\portable-exe-results.json
```

The verifier must pass restricted-PATH startup, real Codex read-only execution, three workflows, isolated write restoration, duplicate launch reuse, forced-stop stale recovery and corrupt-cache reconstruction. The previous 260-character extraction failure must not recur.

- [ ] **Step 4: Inspect the machine-readable evidence**

Run:

```powershell
$evidence = Get-Content -LiteralPath 'test-results\personal-codex-workbench\portable-exe-results.json' -Raw | ConvertFrom-Json
$evidence | ConvertTo-Json -Depth 8
```

Expected:

- Every field in `checks` is `pass`, except `gracefulShutdown`, which may state `covered-by-launcher-unit-test`.
- `cleanWindowsMachine` is exactly `not-tested`.
- Artifact bytes and SHA-256 equal `dist/portable-build-manifest.json`.

- [ ] **Step 5: Run the existing UI verification**

Run:

```powershell
npm.cmd run workbench:verify-ui
```

Expected: UI verification exits 0 and refreshes its existing screenshots/evidence without functional regressions.

### Task 4: Write and commit the final verification report

**Files:**
- Create: `docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md`

- [ ] **Step 1: Create the report from actual build and verification outputs**

Create a Chinese report with five sections:

1. Title: `个人产品经理工作台便携版 EXE 验证报告`.
2. Conclusion: use the exact sentence `当前机器已验证，干净机待验证。`
3. Artifact: copy the EXE path, exact byte count, calculated MiB, lowercase SHA-256, source commit and unsigned status directly from the final Manifest.
4. Verification: copy the final pass/skip/fail counts and list the restricted-PATH launch, real Codex read-only Run, three workflows, isolated write restoration, duplicate launch reuse, stale-state recovery, corrupt-cache recovery and UI regression results.
5. Limitations: state that there is no clean Windows 10/11 machine evidence, the EXE is unsigned and may trigger SmartScreen, and first use requires Codex login plus network access.

Do not estimate values or reuse the superseded artifact hash.

- [ ] **Step 2: Self-check the report against the generated JSON**

Run:

```powershell
rg -n "T[D]B|T[O]DO|待补充|记录最终|精确 bytes|换算 MiB" 'docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md'
git diff --check -- 'docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md'
```

Expected: `rg` finds no placeholders and `git diff --check` produces no output.

- [ ] **Step 3: Commit only the verification report**

Run:

```powershell
git add -- 'docs/superpowers/specs/2026-07-28-portable-personal-codex-workbench-exe-verification.md'
git diff --cached --check
git commit -m "docs: verify portable workbench executable"
```

Expected: one documentation commit. Generated `dist` and `test-results` files remain available for delivery even if ignored by Git.

- [ ] **Step 4: Final delivery check**

Run:

```powershell
Get-Item -LiteralPath 'dist\个人产品经理工作台.exe' | Select-Object FullName,Length,LastWriteTime
Get-FileHash -Algorithm SHA256 -LiteralPath 'dist\个人产品经理工作台.exe'
git log -3 --oneline
```

Expected: the EXE path is present, its hash matches both manifests and the report, and the two focused commits appear without unrelated user files.
