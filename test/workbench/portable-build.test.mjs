import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildManifest,
  payloadSources,
  readSourceCommit,
  validateBuildEnvironment,
} from '../../tools/build-portable-workbench.mjs';

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

test('portable build environment is Windows x64 with the pinned Node version', () => {
  assert.doesNotThrow(() => validateBuildEnvironment());
});

test('build source commit is decoded as a hexadecimal string', async () => {
  const commit = await readSourceCommit();
  assert.match(commit, /^[a-f0-9]{40}$/);
});

test('portable payload uses an explicit allowlist and excludes user state', () => {
  const sources = payloadSources();
  assert.deepEqual(sources.map(value => value.target), [
    'workbench',
    'starter-workspace/docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
    'starter-workspace/demos/产品经理全生命周期工作台demo.html',
  ]);
  assert.equal(
    sources.some(value => /auth\.json|\.workbench-data/i.test(
      `${value.source}\n${value.target}`,
    )),
    false,
  );
});

test('manifest is sorted and contains exact hashes without self-inclusion', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'b'));
  fs.writeFileSync(path.join(root, 'b', 'two.txt'), 'two');
  fs.writeFileSync(path.join(root, 'one.txt'), 'one');
  fs.writeFileSync(path.join(root, 'manifest.json'), 'excluded');
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
  assert.equal(
    manifest.files.every(value => /^[a-f0-9]{64}$/.test(value.sha256)),
    true,
  );
});

test('manifest generation rejects symbolic links', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portable-manifest-link-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'target.txt');
  fs.writeFileSync(target, 'target');
  const link = path.join(root, 'link.txt');
  try {
    fs.symlinkSync(target, link, 'file');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.throws(
    () => buildManifest({
      codexVersion: '0.130.0',
      payloadRoot: root,
      payloadVersion: 'fixture',
      sourceCommit: 'abc123',
    }),
    /symbolic link/i,
  );
});
