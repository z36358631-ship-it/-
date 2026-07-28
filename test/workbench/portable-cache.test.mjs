import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
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

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'expanded');
  fs.mkdirSync(path.join(source, 'workbench'), { recursive: true });
  fs.writeFileSync(
    path.join(source, 'workbench', 'server.mjs'),
    'export const ok = true;\n',
  );
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

test('manifest rejects unsafe paths before reading outside the runtime root', t => {
  const { manifest, source } = fixture(t);
  const unsafe = {
    ...manifest,
    files: [{ ...manifest.files[0], path: '../outside.txt' }],
  };
  assert.throws(() => verifyRuntimeManifest(source, unsafe), /escaped|invalid/i);
});

test('manifest rejects symbolic-link files', t => {
  const { manifest, root, source } = fixture(t);
  const original = path.join(source, 'workbench', 'server.mjs');
  const external = path.join(root, 'external');
  fs.mkdirSync(external);
  const externalFile = path.join(external, 'server.mjs');
  fs.copyFileSync(original, externalFile);

  const linkedFile = path.join(source, 'workbench', 'linked-server.mjs');
  try {
    fs.symlinkSync(externalFile, linkedFile, 'file');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const linkManifest = {
    ...manifest,
    files: [{
      ...manifest.files[0],
      path: 'workbench/linked-server.mjs',
    }],
  };
  assert.throws(() => verifyRuntimeManifest(source, linkManifest), /symbolic|junction/i);
});

test('manifest rejects junction ancestors', t => {
  const { manifest, root, source } = fixture(t);
  const external = path.join(root, 'external');
  fs.mkdirSync(external);
  fs.copyFileSync(
    path.join(source, 'workbench', 'server.mjs'),
    path.join(external, 'server.mjs'),
  );
  const junction = path.join(source, 'linked-workbench');
  try {
    fs.symlinkSync(external, junction, 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) {
      t.skip(`junctions unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const junctionManifest = {
    ...manifest,
    files: [{
      ...manifest.files[0],
      path: 'linked-workbench/server.mjs',
    }],
  };
  assert.throws(
    () => verifyRuntimeManifest(source, junctionManifest),
    /symbolic|junction/i,
  );
});

test('runtime cache reuses a valid target and rebuilds a corrupt target atomically', async t => {
  const { manifest, root, source } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  let extractionCount = 0;
  const expandArchive = async destination => {
    extractionCount += 1;
    fs.cpSync(source, destination, { recursive: true });
  };
  const archive = Buffer.from('fixture archive');
  const options = {
    archive,
    archiveSha256: hashBuffer(archive),
    expandArchive,
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot,
  };
  const first = await ensureRuntimeCache(options);
  const second = await ensureRuntimeCache(options);
  assert.equal(first, second);
  assert.equal(extractionCount, 1);

  fs.appendFileSync(path.join(first, 'workbench', 'server.mjs'), 'corrupt');
  const rebuilt = await ensureRuntimeCache(options);
  assert.equal(rebuilt, first);
  assert.equal(extractionCount, 2);
  assert.doesNotThrow(() => verifyRuntimeManifest(rebuilt, manifest));
});

test('expanded payload verification retries transient file visibility errors', async t => {
  const { manifest, root, source } = fixture(t);
  const archive = Buffer.from('fixture archive');
  let verificationAttempts = 0;
  const result = await ensureRuntimeCache({
    archive,
    archiveSha256: hashBuffer(archive),
    expandArchive: async destination => {
      fs.cpSync(source, destination, { recursive: true });
    },
    manifest,
    payloadVersion: manifest.payloadVersion,
    runtimeRoot: path.join(root, 'runtime'),
    verifyManifest: (runtimePath, runtimeManifest) => {
      verificationAttempts += 1;
      if (verificationAttempts < 3) {
        const error = new Error('file is not visible yet');
        error.code = 'ENOENT';
        throw error;
      }
      verifyRuntimeManifest(runtimePath, runtimeManifest);
    },
  });
  assert.equal(verificationAttempts, 3);
  assert.doesNotThrow(() => verifyRuntimeManifest(result, manifest));
});

test('concurrent Windows rename errors reuse only a fully verified target', async t => {
  const { manifest, root, source } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  const target = path.join(runtimeRoot, manifest.payloadVersion);
  const archive = Buffer.from('fixture archive');
  let winnerAttempts = 0;
  const result = await ensureRuntimeCache({
    archive,
    archiveSha256: hashBuffer(archive),
    expandArchive: async destination => {
      fs.cpSync(source, destination, { recursive: true });
      fs.cpSync(source, target, { recursive: true });
    },
    manifest,
    payloadVersion: manifest.payloadVersion,
    renameRuntime: () => {
      const error = new Error('access denied by winning process');
      error.code = 'EACCES';
      throw error;
    },
    runtimeRoot,
    verifyManifest: (runtimePath, runtimeManifest) => {
      if (runtimePath === target) {
        winnerAttempts += 1;
        if (winnerAttempts === 1) {
          const error = new Error('winning target is briefly busy');
          error.code = 'EBUSY';
          throw error;
        }
      }
      verifyRuntimeManifest(runtimePath, runtimeManifest);
    },
  });
  assert.equal(result, target);
  assert.equal(winnerAttempts, 2);
  assert.doesNotThrow(() => verifyRuntimeManifest(target, manifest));
});

test('concurrent winner visibility is retried even before target existsSync succeeds', async t => {
  const { manifest, root, source } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  const target = path.join(runtimeRoot, manifest.payloadVersion);
  const archive = Buffer.from('fixture archive');
  let winnerAttempts = 0;
  const result = await ensureRuntimeCache({
    archive,
    archiveSha256: hashBuffer(archive),
    expandArchive: async destination => {
      fs.cpSync(source, destination, { recursive: true });
    },
    manifest,
    payloadVersion: manifest.payloadVersion,
    renameRuntime: () => {
      const error = new Error('access denied by not-yet-visible winner');
      error.code = 'EACCES';
      throw error;
    },
    runtimeRoot,
    verifyManifest: (runtimePath, runtimeManifest) => {
      if (runtimePath === target && winnerAttempts === 0) {
        winnerAttempts += 1;
        fs.cpSync(source, target, { recursive: true });
        const error = new Error('winning target is not visible yet');
        error.code = 'ENOENT';
        throw error;
      }
      verifyRuntimeManifest(runtimePath, runtimeManifest);
    },
  });
  assert.equal(result, target);
  assert.equal(winnerAttempts, 1);
  assert.doesNotThrow(() => verifyRuntimeManifest(target, manifest));
});

test('a rename access error without a valid winning target is not swallowed', async t => {
  const { manifest, root, source } = fixture(t);
  const archive = Buffer.from('fixture archive');
  await assert.rejects(
    () => ensureRuntimeCache({
      archive,
      archiveSha256: hashBuffer(archive),
      expandArchive: async destination => {
        fs.cpSync(source, destination, { recursive: true });
      },
      manifest,
      payloadVersion: manifest.payloadVersion,
      renameRuntime: () => {
        const error = new Error('access denied without winner');
        error.code = 'EACCES';
        throw error;
      },
      runtimeRoot: path.join(root, 'runtime'),
    }),
    /access denied without winner/,
  );
});

test('manifest retry is bounded to two seconds for transient errors', async () => {
  let clock = 0;
  let attempts = 0;
  const delays = [];
  await assert.rejects(
    () => verifyRuntimeManifestWithRetry('runtime', {}, {
      delay: async milliseconds => {
        delays.push(milliseconds);
        clock += milliseconds;
      },
      now: () => clock,
      retryDelayMs: 250,
      timeoutMs: 2_000,
      verifyManifest: () => {
        attempts += 1;
        const error = new Error('runtime remains busy');
        error.code = 'EBUSY';
        throw error;
      },
    }),
    /runtime remains busy/,
  );
  assert.equal(clock, 2_000);
  assert.equal(delays.reduce((sum, value) => sum + value, 0), 2_000);
  assert.equal(attempts, 9);
});

test('manifest retry never retries hash or size mismatches', async () => {
  for (const mismatch of ['hash', 'size']) {
    let attempts = 0;
    let delays = 0;
    await assert.rejects(
      () => verifyRuntimeManifestWithRetry('runtime', {}, {
        delay: async () => {
          delays += 1;
        },
        verifyManifest: () => {
          attempts += 1;
          throw new Error(
            `Runtime file ${mismatch} mismatch: workbench/server.mjs`,
          );
        },
      }),
      new RegExp(`${mismatch} mismatch`, 'i'),
    );
    assert.equal(attempts, 1);
    assert.equal(delays, 0);
  }
});

test('archive hash mismatch is rejected before expansion', async t => {
  const { manifest, root } = fixture(t);
  let expanded = false;
  await assert.rejects(
    () => ensureRuntimeCache({
      archive: Buffer.from('tampered archive'),
      archiveSha256: hashBuffer(Buffer.from('expected archive')),
      expandArchive: async () => {
        expanded = true;
      },
      manifest,
      payloadVersion: manifest.payloadVersion,
      runtimeRoot: path.join(root, 'runtime'),
    }),
    /archive SHA-256 mismatch/i,
  );
  assert.equal(expanded, false);
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

test('temporary archive names include randomness so stale PID files do not collide', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-archive-name-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const first = createTemporaryArchivePath(root, 'fixture-v1');
  const second = createTemporaryArchivePath(root, 'fixture-v1');
  assert.notEqual(first, second);
  assert.equal(path.dirname(first), root);
  assert.match(path.basename(first), /^runtime-fixture-v1-\d+-[a-f0-9]{16}\.zip$/);
});

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

test('archive write failures remove a partially written owned ZIP', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-write-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archive = Buffer.from('fixture archive');
  const archiveFile = path.join(root, 'runtime.zip');
  const writeError = new Error('archive write interrupted');
  let powershellCalled = false;

  await assert.rejects(
    () => expandRuntimeArchive({
      archive,
      archiveFile,
      destination: path.join(root, 'destination'),
      execFile: (command, args, options, callback) => {
        powershellCalled = true;
        callback(null);
      },
      writeArchive: (descriptor, value) => {
        fs.writeSync(descriptor, value.subarray(0, 7));
        throw writeError;
      },
    }),
    error => error === writeError,
  );

  assert.equal(powershellCalled, false);
  assert.equal(fs.existsSync(archiveFile), false);
});

test('PowerShell callback failures remove the ZIP and preserve the original error', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-error-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archiveFile = path.join(root, 'runtime.zip');
  const expandError = new Error('Expand-Archive failed');

  await assert.rejects(
    () => expandRuntimeArchive({
      archive: Buffer.from('fixture archive'),
      archiveFile,
      destination: path.join(root, 'destination'),
      execFile: (command, args, options, callback) => {
        callback(expandError);
      },
    }),
    error => error === expandError,
  );

  assert.equal(fs.existsSync(archiveFile), false);
});

test('primary archive errors survive close and remove cleanup failures', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-cleanup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archiveFile = path.join(root, 'runtime.zip');
  const primaryError = new Error('archive write failed');
  const closeError = new Error('archive close failed');
  const removeError = new Error('archive remove failed');
  let powershellCalled = false;
  let removeCalls = 0;

  await assert.rejects(
    () => expandRuntimeArchive({
      archive: Buffer.from('fixture archive'),
      archiveFile,
      closeArchive: descriptor => {
        fs.closeSync(descriptor);
        throw closeError;
      },
      destination: path.join(root, 'destination'),
      execFile: (command, args, options, callback) => {
        powershellCalled = true;
        callback(null);
      },
      removeArchive: filename => {
        removeCalls += 1;
        fs.rmSync(filename, { force: true });
        throw removeError;
      },
      writeArchive: () => {
        throw primaryError;
      },
    }),
    error => {
      assert.equal(error, primaryError);
      assert.deepEqual(error.cleanupErrors, [closeError, removeError]);
      return true;
    },
  );

  assert.equal(powershellCalled, false);
  assert.equal(removeCalls, 1);
  assert.equal(fs.existsSync(archiveFile), false);
});

test('wx ownership conflicts preserve the existing ZIP without removing it', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-owned-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archiveFile = path.join(root, 'runtime.zip');
  fs.writeFileSync(archiveFile, 'existing archive', 'utf8');
  let powershellCalled = false;
  let removeCalled = false;

  await assert.rejects(
    () => expandRuntimeArchive({
      archive: Buffer.from('replacement archive'),
      archiveFile,
      destination: path.join(root, 'destination'),
      execFile: (command, args, options, callback) => {
        powershellCalled = true;
        callback(null);
      },
      removeArchive: () => {
        removeCalled = true;
      },
    }),
    error => error?.code === 'EEXIST',
  );

  assert.equal(powershellCalled, false);
  assert.equal(removeCalled, false);
  assert.equal(fs.readFileSync(archiveFile, 'utf8'), 'existing archive');
});

test('cleanup failures without a primary error propagate the first cleanup error', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-expand-remove-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archiveFile = path.join(root, 'runtime.zip');
  const removeError = new Error('archive remove failed');

  await assert.rejects(
    () => expandRuntimeArchive({
      archive: Buffer.from('fixture archive'),
      archiveFile,
      destination: path.join(root, 'destination'),
      execFile: (command, args, options, callback) => {
        callback(null);
      },
      removeArchive: filename => {
        fs.rmSync(filename, { force: true });
        throw removeError;
      },
    }),
    error => error === removeError,
  );

  assert.equal(fs.existsSync(archiveFile), false);
});

test('startup failures are logged with credential-like values redacted', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-startup-log-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeStartupFailure(root, Object.assign(
    new Error('request token=secret-value auth.json Bearer abc.def'),
    { code: 'E_START' },
  ));
  const log = fs.readFileSync(path.join(root, 'launcher.log'), 'utf8');
  assert.match(log, /ERROR SEA startup failed/);
  assert.match(log, /E_START/);
  assert.doesNotMatch(log, /secret-value|auth\.json|abc\.def/);
});
