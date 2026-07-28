import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileSafety } from '../../workbench/lib/file-safety.mjs';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-safety-'));
  fs.mkdirSync(path.join(root, 'prd'));
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), '第一行\n旧规则\n', 'utf8');
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  return { root, safety: new FileSafety({ allowedRoot: root }) };
}

test('snapshot and locatable text diff are limited to exact declared targets', t => {
  const { root, safety } = fixture(t);
  const snapshot = safety.capture(['prd/feature.md', 'prd/candidate.md']);
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), '第一行\n新规则\n', 'utf8');
  fs.writeFileSync(path.join(root, 'prd', 'candidate.md'), '# 候选\n', 'utf8');
  fs.writeFileSync(path.join(root, 'prd', 'unrelated.md'), '用户脏改动\n', 'utf8');

  const changes = safety.compare(snapshot);
  assert.deepEqual(changes.map(item => item.path), ['prd/candidate.md', 'prd/feature.md']);
  assert.equal(changes[0].kind, 'created');
  assert.match(changes[1].diff, /^--- a\/prd\/feature\.md/m);
  assert.match(changes[1].diff, /^\+\+\+ b\/prd\/feature\.md/m);
  assert.match(changes[1].diff, /^@@ -1,2 \+1,2 @@$/m);
  assert.match(changes[1].diff, /^-旧规则$/m);
  assert.match(changes[1].diff, /^\+新规则$/m);
});

test('targets must be relative regular files inside the root and are capped at 20', t => {
  const { root, safety } = fixture(t);
  assert.throws(
    () => safety.capture([path.join(root, 'prd', 'feature.md')]),
    /must be relative/,
  );
  assert.throws(() => safety.capture(['prd']), /regular file/);
  assert.throws(
    () => safety.capture(Array.from({ length: 21 }, (_, index) => `prd/${index}.md`)),
    /at most 20/,
  );
  assert.throws(() => safety.capture(['']), /non-empty relative path/);

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'file-safety-outside-'));
  t.after(() => fs.rmSync(outside, { force: true, recursive: true }));
  fs.writeFileSync(path.join(outside, 'secret.md'), 'secret', 'utf8');
  fs.symlinkSync(outside, path.join(root, 'escape'), 'junction');
  assert.throws(
    () => safety.capture(['escape/secret.md']),
    /outside allowed root|symbolic link|junction/i,
  );

  const link = path.join(root, 'prd', 'linked.md');
  try {
    fs.symlinkSync(path.join(outside, 'secret.md'), link, 'file');
    assert.throws(
      () => safety.capture(['prd/linked.md']),
      /outside allowed root|symbolic link/i,
    );
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
  }
});

test('capture and compare reject files larger than 10MB before diffing', t => {
  const { root, safety } = fixture(t);
  const large = path.join(root, 'prd', 'large.txt');
  fs.writeFileSync(large, Buffer.alloc(MAX_FILE_BYTES + 1, 0x61));
  assert.throws(() => safety.capture(['prd/large.txt']), /10 MB/);

  const snapshot = safety.capture(['prd/feature.md']);
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), Buffer.alloc(MAX_FILE_BYTES + 1, 0x62));
  assert.throws(() => safety.compare(snapshot), /10 MB/);
});

test('staging is run-scoped, isolated and rejects unsafe reuse or arbitrary roots', t => {
  const { root, safety } = fixture(t);
  const snapshot = safety.capture(['prd/feature.md']);
  const runId = `RUN-${crypto.randomUUID()}`;
  const stagingRoot = safety.prepareStaging(runId, snapshot);
  assert.equal(
    stagingRoot,
    path.join(root, '.workbench-data', 'staging', runId),
  );
  assert.equal(
    fs.readFileSync(path.join(stagingRoot, 'prd', 'feature.md'), 'utf8'),
    '第一行\n旧规则\n',
  );
  assert.match(fs.readFileSync(path.join(root, 'prd', 'feature.md'), 'utf8'), /旧规则/);
  assert.throws(
    () => safety.prepareStaging('RUN-not-a-uuid', snapshot),
    /Invalid run id/,
  );
  assert.throws(
    () => safety.compare(snapshot, path.join(root, 'prd')),
    /run-scoped staging root/,
  );

  fs.writeFileSync(path.join(stagingRoot, 'surprise.txt'), 'unexpected', 'utf8');
  assert.deepEqual(
    safety.findUnexpectedFiles(stagingRoot, ['prd/feature.md']),
    ['surprise.txt'],
  );
  assert.throws(
    () => safety.prepareStaging(runId, snapshot),
    /unexpected staging entries/,
  );
});

test('broker applies only declared staged targets and preserves unrelated dirty files', t => {
  const { root, safety } = fixture(t);
  fs.writeFileSync(path.join(root, 'prd', 'unrelated.md'), '用户脏改动\n', 'utf8');
  const snapshot = safety.capture(['prd/feature.md']);
  const stagingRoot = safety.prepareStaging(`RUN-${crypto.randomUUID()}`, snapshot);
  fs.writeFileSync(path.join(stagingRoot, 'prd', 'feature.md'), '暂存修改\n', 'utf8');

  const stagedChanges = safety.compare(snapshot, stagingRoot);
  const applied = safety.applyFromStaging(snapshot, stagedChanges, stagingRoot);
  assert.equal(applied[0].kind, 'modified');
  assert.equal(
    fs.readFileSync(path.join(root, 'prd', 'feature.md'), 'utf8'),
    '暂存修改\n',
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'prd', 'unrelated.md'), 'utf8'),
    '用户脏改动\n',
  );
});

test('apply verifies both the real before hash and staged after hash before writing', t => {
  const { root, safety } = fixture(t);
  const target = path.join(root, 'prd', 'feature.md');
  const snapshot = safety.capture(['prd/feature.md']);
  const stagingRoot = safety.prepareStaging(`RUN-${crypto.randomUUID()}`, snapshot);
  const stagedTarget = path.join(stagingRoot, 'prd', 'feature.md');
  fs.writeFileSync(stagedTarget, 'Codex 修改\n', 'utf8');
  const changes = safety.compare(snapshot, stagingRoot);

  fs.writeFileSync(target, '用户并发修改\n', 'utf8');
  assert.throws(
    () => safety.applyFromStaging(snapshot, changes, stagingRoot),
    /changed while Codex was running/,
  );
  assert.equal(fs.readFileSync(target, 'utf8'), '用户并发修改\n');

  fs.writeFileSync(target, '第一行\n旧规则\n', 'utf8');
  fs.writeFileSync(stagedTarget, '暂存被篡改\n', 'utf8');
  assert.throws(
    () => safety.applyFromStaging(snapshot, changes, stagingRoot),
    /Staging hash mismatch/,
  );
  assert.equal(fs.readFileSync(target, 'utf8'), '第一行\n旧规则\n');

  fs.writeFileSync(stagedTarget, 'Codex 修改\n', 'utf8');
  assert.throws(
    () => safety.applyFromStaging(snapshot, changes, stagingRoot, () => {
      fs.writeFileSync(target, '校验后并发修改\n', 'utf8');
    }),
    /changed while Codex was running/,
  );
  assert.equal(fs.readFileSync(target, 'utf8'), '校验后并发修改\n');
});

test('apply refuses staged deletion and leaves the real file intact', t => {
  const { root, safety } = fixture(t);
  const target = path.join(root, 'prd', 'feature.md');
  const snapshot = safety.capture(['prd/feature.md']);
  const stagingRoot = safety.prepareStaging(`RUN-${crypto.randomUUID()}`, snapshot);
  fs.unlinkSync(path.join(stagingRoot, 'prd', 'feature.md'));
  const changes = safety.compare(snapshot, stagingRoot);
  assert.equal(changes[0].kind, 'deleted');
  assert.throws(
    () => safety.applyFromStaging(snapshot, changes, stagingRoot),
    /Deletion is not applied/,
  );
  assert.equal(fs.readFileSync(target, 'utf8'), '第一行\n旧规则\n');
});

test('binary changes expose hashes without embedding binary content', t => {
  const { root, safety } = fixture(t);
  const target = path.join(root, 'prd', 'binary.dat');
  fs.writeFileSync(target, Buffer.from([0, 1, 2, 3]));
  const snapshot = safety.capture(['prd/binary.dat']);
  fs.writeFileSync(target, Buffer.from([0, 4, 5, 6]));
  const [change] = safety.compare(snapshot);
  assert.equal(change.kind, 'modified');
  assert.match(change.beforeHash, /^[a-f0-9]{64}$/);
  assert.match(change.afterHash, /^[a-f0-9]{64}$/);
  assert.equal(change.diff, 'Binary file changed');
  assert.equal(Object.hasOwn(change, 'contentBase64'), false);
});

test('restore rejects later edits and never touches unrelated dirty files', t => {
  const { root, safety } = fixture(t);
  const unrelated = path.join(root, 'unrelated.txt');
  const target = path.join(root, 'prd', 'feature.md');
  fs.writeFileSync(unrelated, '保留我', 'utf8');
  const snapshot = safety.capture(['prd/feature.md']);
  fs.writeFileSync(target, 'Codex 修改\n', 'utf8');
  const changes = safety.compare(snapshot);
  safety.restore(snapshot, changes);
  assert.equal(fs.readFileSync(target, 'utf8'), '第一行\n旧规则\n');
  assert.equal(fs.readFileSync(unrelated, 'utf8'), '保留我');

  fs.writeFileSync(target, 'Codex 修改\n', 'utf8');
  const laterChanges = safety.compare(snapshot);
  fs.writeFileSync(target, '用户随后修改\n', 'utf8');

  assert.throws(() => safety.restore(snapshot, laterChanges), /changed after this run/);
  assert.equal(fs.readFileSync(target, 'utf8'), '用户随后修改\n');
  assert.equal(fs.readFileSync(unrelated, 'utf8'), '保留我');
});

test('restore preflight validates every change without modifying an earlier file', t => {
  const { root, safety } = fixture(t);
  const first = path.join(root, 'prd', 'feature.md');
  const second = path.join(root, 'prd', 'second.md');
  fs.writeFileSync(second, 'second before\n', 'utf8');
  const snapshot = safety.capture(['prd/feature.md', 'prd/second.md']);
  fs.writeFileSync(first, 'first Codex version\n', 'utf8');
  fs.writeFileSync(second, 'second Codex version\n', 'utf8');
  const changes = safety.compare(snapshot);
  fs.writeFileSync(second, 'second user version\n', 'utf8');

  assert.throws(
    () => safety.assertRestorable(snapshot, changes),
    /changed after this run: prd\/second\.md/,
  );
  assert.equal(fs.readFileSync(first, 'utf8'), 'first Codex version\n');
  assert.equal(fs.readFileSync(second, 'utf8'), 'second user version\n');
});

test('restore removes only a matching file created by that run', t => {
  const { root, safety } = fixture(t);
  const candidate = path.join(root, 'prd', 'candidate.md');
  const snapshot = safety.capture(['prd/candidate.md']);
  fs.writeFileSync(candidate, '# candidate\n', 'utf8');
  const changes = safety.compare(snapshot);
  safety.restore(snapshot, changes);
  assert.equal(fs.existsSync(candidate), false);

  const secondSnapshot = safety.capture(['prd/candidate.md']);
  fs.writeFileSync(candidate, '# run output\n', 'utf8');
  const secondChanges = safety.compare(secondSnapshot);
  fs.writeFileSync(candidate, '# user replacement\n', 'utf8');
  assert.throws(
    () => safety.restore(secondSnapshot, secondChanges),
    /changed after this run/,
  );
  assert.equal(fs.readFileSync(candidate, 'utf8'), '# user replacement\n');
});
