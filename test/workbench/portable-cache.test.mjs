import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  createTemporaryArchivePath,
  hashBuffer,
  hashFile,
  verifyRuntimeManifest,
  ensureRuntimeCache,
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

test('concurrent Windows rename errors reuse only a fully verified target', async t => {
  const { manifest, root, source } = fixture(t);
  const runtimeRoot = path.join(root, 'runtime');
  const target = path.join(runtimeRoot, manifest.payloadVersion);
  const archive = Buffer.from('fixture archive');
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
  });
  assert.equal(result, target);
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
