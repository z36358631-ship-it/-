import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  createVerificationMetadata,
  writeJsonAtomic
} from './verification-metadata.mjs';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const allowlist = JSON.parse(
  await fs.readFile(path.join(root, 'tools', 'wechat-h5-delivery-allowlist.json'), 'utf8')
);
const allowlistBody = await fs.readFile(
  path.join(root, 'tools', 'wechat-h5-delivery-allowlist.json')
);
const verifier = path.join(root, 'tools', 'verify-wechat-h5-delivery.mjs');
const failures = [];

const metadataRepository = await fs.mkdtemp(path.join(os.tmpdir(), 'wechat-metadata-repository-'));
try {
  await fs.writeFile(path.join(metadataRepository, 'tracked.txt'), 'clean\n');
  const metadataGit = (...args) => execFileAsync('git', args, {
    cwd: metadataRepository,
    windowsHide: true
  });
  await metadataGit('init');
  await metadataGit('config', 'user.name', 'Metadata Fixture');
  await metadataGit('config', 'user.email', 'metadata-fixture@example.invalid');
  await metadataGit('add', '--', 'tracked.txt');
  await metadataGit('commit', '-m', 'fixture: clean');
  const cleanMetadata = await createVerificationMetadata({
    root: metadataRepository,
    testedPaths: ['tracked.txt', 'tracked.txt']
  });
  assert.equal(cleanMetadata.sourceState.testedPathsDirty, false);
  assert.equal(cleanMetadata.sourceState.testedPathCount, 1);
  await fs.appendFile(path.join(metadataRepository, 'tracked.txt'), 'dirty\n');
  const dirtyMetadata = await createVerificationMetadata({
    root: metadataRepository,
    testedPaths: ['tracked.txt']
  });
  assert.equal(dirtyMetadata.sourceState.testedPathsDirty, true);
  process.stdout.write('metadata-source-state CLEAN_AND_DIRTY_DETECTED\n');
} catch (error) {
  failures.push(`metadata-source-state: ${error.stack || error.message}`);
} finally {
  await fs.rm(metadataRepository, { recursive: true, force: true });
}

function sha256(body) {
  return createHash('sha256').update(body).digest('hex');
}

async function createFixture({
  commits,
  extraFile = false,
  tamperPath,
  testedPathsDirty = false
}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wechat-delivery-negative-'));
  const reportMetadata = [];
  const bodies = new Map();
  for (const relative of allowlist.files) {
    let body = Buffer.from(`fixture:${relative}\n`);
    if (relative === 'tools/wechat-h5-delivery-allowlist.json') {
      body = allowlistBody;
    }
    const reportIndex = allowlist.reports.indexOf(relative);
    if (reportIndex >= 0) {
      const report = {
        schemaVersion: 1,
        generatedAt: '2026-07-29T00:00:00.000Z',
        gitCommit: commits[reportIndex],
        command: `node report-${reportIndex}.mjs`,
        environment: {
          nodeVersion: process.version,
          browserVersion: 'fixture'
        },
        sourceState: {
          testedPathsDirty,
          testedPathCount: 1,
          statusCheck: 'git-status-porcelain-v1'
        },
        summary: { pass: 1, fail: 0 },
        exitCode: 0
      };
      body = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
      reportMetadata.push({
        path: relative,
        schemaVersion: report.schemaVersion,
        generatedAt: report.generatedAt,
        gitCommit: report.gitCommit,
        command: report.command,
        exitCode: report.exitCode,
        sourceState: report.sourceState,
        summary: report.summary
      });
    }
    bodies.set(relative, body);
  }
  if (extraFile) bodies.set('unexpected-but-self-consistent.txt', Buffer.from('unexpected\n'));

  for (const [relative, body] of bodies) {
    const absolute = path.join(directory, ...relative.split('/'));
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, body);
  }

  const files = [...bodies]
    .map(([relative, body]) => ({
      path: relative,
      bytes: body.length,
      sha256: sha256(body)
    }));
  const testedSourceCommit = commits[0];
  const packageCommit = 'b'.repeat(40);
  const manifest = {
    schemaVersion: 1,
    scope: 'non-production-review-package',
    disclaimer: 'fixture',
    packageCommit,
    packageShortCommit: packageCommit.slice(0, 8),
    testedSourceCommit,
    buildTime: '2026-07-29T00:01:00.000Z',
    sourceDiff: {
      checked: true,
      baseCommit: testedSourceCommit,
      headCommit: packageCommit,
      runtimePathCount: allowlist.runtimePaths.length
    },
    verificationReports: reportMetadata,
    files
  };
  const manifestBody = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(directory, 'DELIVERY-MANIFEST.json'), manifestBody);
  const sums = [
    ...files,
    { path: 'DELIVERY-MANIFEST.json', sha256: sha256(manifestBody) }
  ].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  await fs.writeFile(
    path.join(directory, 'SHA256SUMS.txt'),
    `${sums.map(file => `${file.sha256}  ${file.path}`).join('\n')}\n`
  );
  if (tamperPath) {
    await fs.appendFile(path.join(directory, ...tamperPath.split('/')), 'tampered');
  }
  return directory;
}

async function expectVerifierRejects(name, options) {
  const fixture = await createFixture(options);
  try {
    await execFileAsync(process.execPath, [verifier, fixture], { cwd: root });
    failures.push(`${name}: verifier 错误接受`);
  } catch {
    process.stdout.write(`${name} REJECTED\n`);
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
}

const validFixture = await createFixture({
  commits: Array(allowlist.reports.length).fill('a'.repeat(40))
});
try {
  const { stdout } = await execFileAsync(process.execPath, [verifier, validFixture], { cwd: root });
  assert.match(stdout, /INTEGRITY PASS · UNAUTHENTICATED/u);
  process.stdout.write('synthetic-package INTEGRITY_ONLY\n');
} catch (error) {
  failures.push(`synthetic-package: ${error.stderr || error.stack || error.message}`);
}
try {
  await execFileAsync(
    process.execPath,
    [verifier, validFixture, '--trusted-repo', root],
    { cwd: root }
  );
  failures.push('synthetic-package: trusted verifier 错误接受不存在的 Git commits');
} catch {
  process.stdout.write('synthetic-package TRUST_REJECTED\n');
} finally {
  await fs.rm(validFixture, { recursive: true, force: true });
}

await expectVerifierRejects('extra-file', {
  commits: Array(allowlist.reports.length).fill('a'.repeat(40)),
  extraFile: true
});
await expectVerifierRejects('unavailable-report', {
  commits: ['unavailable', ...Array(allowlist.reports.length - 1).fill('a'.repeat(40))]
});
await expectVerifierRejects('mixed-tested-commits', {
  commits: ['a'.repeat(40), ...Array(allowlist.reports.length - 1).fill('c'.repeat(40))]
});
await expectVerifierRejects('dirty-tested-paths', {
  commits: Array(allowlist.reports.length).fill('a'.repeat(40)),
  testedPathsDirty: true
});
await expectVerifierRejects('tampered-payload', {
  commits: Array(allowlist.reports.length).fill('a'.repeat(40)),
  tamperPath: allowlist.files.find(relative => relative.endsWith('.html'))
});

const atomicDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wechat-atomic-negative-'));
try {
  const reportFile = path.join(atomicDirectory, 'report.json');
  await fs.writeFile(reportFile, '{"old":true}\n');
  let retryCalls = 0;
  await writeJsonAtomic(
    reportFile,
    { current: true },
    {
      renameFile: async (source, destination) => {
        retryCalls += 1;
        if (retryCalls < 3) {
          const error = new Error('simulated lock');
          error.code = 'EPERM';
          throw error;
        }
        await fs.rename(source, destination);
      },
      retryDelaysMs: [1, 1, 1]
    }
  );
  if (retryCalls !== 3) failures.push(`lock-retry: expected 3 calls, got ${retryCalls}`);
  else process.stdout.write('atomic-lock-retry ACCEPTED_AFTER_RETRY\n');

  await fs.writeFile(reportFile, '{"old":true}\n');
  await assert.rejects(
    writeJsonAtomic(
      reportFile,
      { current: true },
      {
        renameFile: async () => {
          const error = new Error('simulated persistent lock');
          error.code = 'EBUSY';
          throw error;
        },
        retryDelaysMs: [1, 1]
      }
    )
  );
  assert.equal(await fs.readFile(reportFile, 'utf8'), '{"old":true}\n');
  assert.deepEqual(await fs.readdir(atomicDirectory), ['report.json']);
  process.stdout.write('atomic-lock-conflict OLD_REPORT_PRESERVED\n');
} catch (error) {
  failures.push(`lock-conflict: ${error.stack || error.message}`);
} finally {
  await fs.rm(atomicDirectory, { recursive: true, force: true });
}

const unsafeOutputs = [
  path.join(os.tmpdir(), `wechat-output-boundary-${process.pid}-${Date.now()}`),
  `dist/../wechat-output-boundary-${process.pid}-${Date.now()}`
];
for (const unsafeOutput of unsafeOutputs) {
  try {
    await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(root, 'tools', 'build-wechat-h5-delivery.ps1'),
        '-OutputDirectory',
        unsafeOutput
      ],
      { cwd: root, windowsHide: true }
    );
    failures.push(`output-boundary: builder 错误接受 ${unsafeOutput}`);
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    if (!/OutputDirectory/u.test(output)) {
      failures.push(`output-boundary: 未在白名单脏检查前明确拒绝 ${unsafeOutput}`);
    }
  }
  const resolvedUnsafe = path.resolve(root, unsafeOutput);
  try {
    await fs.access(resolvedUnsafe);
    failures.push(`output-boundary: 拒绝后仍创建 ${resolvedUnsafe}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    process.stdout.write(`output-boundary REJECTED ${unsafeOutput}\n`);
  }
}

const staleRepository = await fs.mkdtemp(path.join(os.tmpdir(), 'wechat-stale-repository-'));
try {
  for (const relative of allowlist.files) {
    const absolute = path.join(staleRepository, ...relative.split('/'));
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, `fixture:${relative}\n`);
  }
  for (const relative of [
    'tools/build-wechat-h5-delivery.ps1',
    'tools/export-wechat-h5-git-snapshot.mjs',
    'tools/verify-wechat-h5-delivery.mjs',
    'tools/wechat-h5-delivery-allowlist.json'
  ]) {
    await fs.copyFile(path.join(root, ...relative.split('/')), path.join(staleRepository, ...relative.split('/')));
  }
  const git = (...args) => execFileAsync('git', args, {
    cwd: staleRepository,
    windowsHide: true
  });
  await git('init');
  await git('config', 'user.name', 'Delivery Fixture');
  await git('config', 'user.email', 'delivery-fixture@example.invalid');
  await git('add', '--', '.');
  await git('commit', '-m', 'fixture: source');
  const { stdout: sourceStdout } = await git('rev-parse', 'HEAD');
  const testedSourceCommit = sourceStdout.trim();

  for (const [index, relative] of allowlist.reports.entries()) {
    const report = {
      schemaVersion: 1,
      generatedAt: '2026-07-29T00:00:00.000Z',
      gitCommit: testedSourceCommit,
      command: `node report-${index}.mjs`,
      environment: {
        nodeVersion: process.version,
        browserVersion: 'fixture'
      },
      sourceState: {
        testedPathsDirty: false,
        testedPathCount: 1,
        statusCheck: 'git-status-porcelain-v1'
      },
      summary: { pass: 1, fail: 0 },
      exitCode: 0
    };
    await fs.writeFile(
      path.join(staleRepository, ...relative.split('/')),
      `${JSON.stringify(report, null, 2)}\n`
    );
  }
  await git('add', '--', ...allowlist.reports);
  await git('commit', '-m', 'fixture: evidence');
  await execFileAsync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(staleRepository, 'tools', 'build-wechat-h5-delivery.ps1'),
      '-OutputDirectory',
      'dist/valid-test'
    ],
    { cwd: staleRepository, windowsHide: true }
  );
  const validOutput = path.join(staleRepository, 'dist', 'valid-test');
  const validArtifacts = await fs.readdir(validOutput);
  const validZips = validArtifacts.filter(file => file.endsWith('.zip'));
  const validDigests = validArtifacts.filter(file => file.endsWith('.zip.sha256'));
  assert.equal(validZips.length, 1, '有效 fixture 必须生成唯一 ZIP');
  assert.equal(validDigests.length, 1, '有效 fixture 必须生成唯一包外 ZIP SHA-256');
  const zipBody = await fs.readFile(path.join(validOutput, validZips[0]));
  const digestBody = await fs.readFile(path.join(validOutput, validDigests[0]), 'utf8');
  assert.equal(
    digestBody,
    `${sha256(zipBody)}  ${validZips[0]}\n`,
    '包外 ZIP SHA-256 与实际压缩包不一致'
  );
  process.stdout.write('pinned-git-package ACCEPTED\n');
  await fs.rm(path.join(staleRepository, 'dist'), { recursive: true, force: true });

  const changedRuntime = allowlist.runtimePaths.find(relative => relative.endsWith('.html'));
  await fs.appendFile(path.join(staleRepository, ...changedRuntime.split('/')), 'runtime changed\n');
  await git('add', '--', changedRuntime);
  await git('commit', '-m', 'fixture: stale runtime');

  try {
    await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(staleRepository, 'tools', 'build-wechat-h5-delivery.ps1'),
        '-OutputDirectory',
        'dist/stale-test'
      ],
      { cwd: staleRepository, windowsHide: true }
    );
    failures.push('stale-report: builder 错误接受运行时源码已变化的报告');
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    if (!/\[STALE_REPORT\]/u.test(output)) {
      failures.push(`stale-report: 未命中源码差异门禁\n${output}`);
    } else {
      process.stdout.write('stale-report REJECTED\n');
    }
  }
  const staleOutput = path.join(staleRepository, 'dist', 'stale-test');
  const staleFiles = await fs.readdir(staleOutput).catch(() => []);
  if (staleFiles.some(file => file.endsWith('.zip'))) {
    failures.push('stale-report: 拒绝后仍生成 ZIP');
  }
} catch (error) {
  failures.push(`stale-report-fixture: ${error.stack || error.message}`);
} finally {
  await fs.rm(staleRepository, { recursive: true, force: true });
}

if (failures.length > 0) {
  throw new Error(`delivery negative fixtures failed:\n${failures.join('\n')}`);
}
process.stdout.write('wechat-h5-delivery negative fixtures PASS\n');
