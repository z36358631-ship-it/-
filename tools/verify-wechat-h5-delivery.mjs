import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

assert(
  process.argv[2],
  '用法：node tools/verify-wechat-h5-delivery.mjs <解压后的交付目录> [--trusted-repo <Git 仓库>]'
);

const execFileAsync = promisify(execFile);
const root = path.resolve(process.argv[2]);
const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const trustedRepoFlag = process.argv.indexOf('--trusted-repo');
assert(
  trustedRepoFlag === -1 || (
    trustedRepoFlag === 3
    && typeof process.argv[trustedRepoFlag + 1] === 'string'
    && process.argv[trustedRepoFlag + 1].length > 0
    && process.argv.length === trustedRepoFlag + 2
  ),
  '--trusted-repo 必须且只能跟一个 Git 仓库路径'
);
const trustedRepo = trustedRepoFlag === -1
  ? null
  : path.resolve(process.argv[trustedRepoFlag + 1]);
const manifestPath = path.join(root, 'DELIVERY-MANIFEST.json');
const sumsPath = path.join(root, 'SHA256SUMS.txt');
const manifestBody = await fs.readFile(manifestPath);
const manifest = JSON.parse(manifestBody.toString('utf8').replace(/^\uFEFF/u, ''));
assert.match(manifest.packageCommit, /^[0-9a-f]{40}$/u, 'packageCommit 必须是 40 位 Git SHA');
assert.match(
  manifest.testedSourceCommit,
  /^[0-9a-f]{40}$/u,
  'testedSourceCommit 必须是 40 位 Git SHA，不能 unavailable'
);
let trustedAllowlistBody;
if (trustedRepo) {
  const { stdout: insideWorkTree } = await git(['rev-parse', '--is-inside-work-tree']);
  assert.equal(insideWorkTree.trim(), 'true', '--trusted-repo 不是 Git 工作树');
  await git(['cat-file', '-e', `${manifest.packageCommit}^{commit}`]);
  await git(['cat-file', '-e', `${manifest.testedSourceCommit}^{commit}`]);
  await git([
    'merge-base',
    '--is-ancestor',
    manifest.testedSourceCommit,
    manifest.packageCommit
  ]);
  const { stdout } = await git(
    ['cat-file', 'blob', `${manifest.packageCommit}:tools/wechat-h5-delivery-allowlist.json`],
    { encoding: 'buffer' }
  );
  trustedAllowlistBody = stdout;
} else {
  trustedAllowlistBody = await fs.readFile(
    path.join(toolRoot, 'wechat-h5-delivery-allowlist.json')
  );
}
const allowlist = JSON.parse(trustedAllowlistBody.toString('utf8').replace(/^\uFEFF/u, ''));
const forbiddenNames = new Set(['project.private.config.json']);
const forbiddenExtensions = new Set(['.key', '.pem', '.pfx', '.zip']);

function sha256(body) {
  return createHash('sha256').update(body).digest('hex');
}

async function git(args, options = {}) {
  assert(trustedRepo, '可信 Git 操作缺少 --trusted-repo');
  return execFileAsync('git', ['-C', trustedRepo, ...args], {
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...options
  });
}

function cleanRelativePath(value, label = '路径') {
  assert.equal(typeof value, 'string', `${label}必须是字符串`);
  assert(value.length > 0, `${label}不能为空`);
  assert(!value.includes('\\'), `${label}必须使用正斜杠：${value}`);
  assert(!path.posix.isAbsolute(value), `${label}不能是绝对路径：${value}`);
  const normalized = path.posix.normalize(value);
  assert.equal(normalized, value, `${label}未规范化：${value}`);
  assert(!normalized.startsWith('../') && normalized !== '..', `${label}越界：${value}`);
  assert(!normalized.split('/').includes(''), `${label}包含空段：${value}`);
  return normalized;
}

function assertSortedUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label}包含重复路径`);
  assert.deepEqual([...values].sort(), values, `${label}必须按路径升序排列`);
}

function assertAllowedFile(relative) {
  const name = path.posix.basename(relative);
  const lowerName = name.toLowerCase();
  assert(!forbiddenNames.has(lowerName), `交付包包含禁止文件：${relative}`);
  assert(!lowerName.startsWith('.env'), `交付包包含环境文件：${relative}`);
  assert(
    !forbiddenExtensions.has(path.posix.extname(lowerName)),
    `交付包包含敏感扩展名：${relative}`
  );
}

async function walk(directory) {
  const output = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `交付包不得包含符号链接：${absolute}`);
    if (entry.isDirectory()) {
      output.push(...await walk(absolute));
    } else {
      output.push(path.relative(root, absolute).replaceAll('\\', '/'));
    }
  }
  return output;
}

assert.equal(allowlist.schemaVersion, 1, '交付白名单 schemaVersion 必须为 1');
for (const property of ['files', 'reports', 'runtimePaths']) {
  assert(Array.isArray(allowlist[property]), `交付白名单缺少 ${property}`);
  allowlist[property] = allowlist[property].map(value => cleanRelativePath(value, `${property} 路径`));
  assertSortedUnique(allowlist[property], `allowlist.${property}`);
}
assert(allowlist.files.includes('tools/wechat-h5-delivery-allowlist.json'), '白名单必须包含自身');
for (const reportPath of allowlist.reports) {
  assert(allowlist.files.includes(reportPath), `报告未列入 files：${reportPath}`);
}
for (const runtimePath of allowlist.runtimePaths) {
  assert(allowlist.files.includes(runtimePath), `运行时文件未列入 files：${runtimePath}`);
  assert(!allowlist.reports.includes(runtimePath), `报告不能列入 runtimePaths：${runtimePath}`);
}
for (const relative of allowlist.files) assertAllowedFile(relative);
const packagedAllowlistBody = await fs.readFile(
  path.join(root, 'tools', 'wechat-h5-delivery-allowlist.json')
);
assert.deepEqual(
  JSON.parse(packagedAllowlistBody.toString('utf8').replace(/^\uFEFF/u, '')),
  allowlist,
  '交付包内版本化白名单与验包器信任版本不一致'
);

assert.equal(manifest.schemaVersion, 1, 'DELIVERY-MANIFEST schemaVersion 必须为 1');
assert.equal(manifest.scope, 'non-production-review-package', '交付范围必须为非生产评审包');
assert.match(manifest.packageCommit, /^[0-9a-f]{40}$/u, 'packageCommit 必须是 40 位 Git SHA');
assert.equal(
  manifest.packageShortCommit,
  manifest.packageCommit.slice(0, 8),
  'packageShortCommit 必须由 packageCommit 的前 8 位计算'
);
assert.match(
  manifest.testedSourceCommit,
  /^[0-9a-f]{40}$/u,
  'testedSourceCommit 必须是 40 位 Git SHA，不能 unavailable'
);
assert(!Number.isNaN(Date.parse(manifest.buildTime)), 'buildTime 必须是 ISO-8601 时间');
assert.deepEqual(
  manifest.sourceDiff,
  {
    checked: true,
    baseCommit: manifest.testedSourceCommit,
    headCommit: manifest.packageCommit,
    runtimePathCount: allowlist.runtimePaths.length
  },
  'manifest.sourceDiff 缺少固定源码差异检查结果'
);

assert(Array.isArray(manifest.files), 'manifest.files 必须是数组');
const manifestPaths = manifest.files.map(file => cleanRelativePath(file.path, 'manifest 文件路径'));
assert.deepEqual(manifestPaths, allowlist.files, 'manifest.files 与版本化严格白名单不一致');

for (const file of manifest.files) {
  assert(Number.isSafeInteger(file.bytes) && file.bytes >= 0, `${file.path} bytes 无效`);
  assert.match(file.sha256, /^[0-9a-f]{64}$/u, `${file.path} SHA-256 格式无效`);
  const absolute = path.join(root, ...file.path.split('/'));
  const body = await fs.readFile(absolute);
  assert.equal(body.length, file.bytes, `${file.path} 文件长度不一致`);
  assert.equal(sha256(body), file.sha256, `${file.path} SHA-256 不一致`);
}

assert(Array.isArray(manifest.verificationReports), 'manifest 缺少 verificationReports');
assert.deepEqual(
  manifest.verificationReports.map(report => report.path),
  allowlist.reports,
  'verificationReports 路径必须与严格白名单一致'
);

for (const reportEntry of manifest.verificationReports) {
  const reportPath = cleanRelativePath(reportEntry.path, '验证报告路径');
  const reportBody = await fs.readFile(path.join(root, ...reportPath.split('/')), 'utf8');
  const report = JSON.parse(reportBody.replace(/^\uFEFF/u, ''));
  assert.equal(report.schemaVersion, 1, `${reportPath} schemaVersion 必须为 1`);
  assert.equal(
    report.gitCommit,
    manifest.testedSourceCommit,
    `${reportPath} 未绑定统一 testedSourceCommit`
  );
  assert(!Number.isNaN(Date.parse(report.generatedAt)), `${reportPath} generatedAt 无效`);
  assert.equal(typeof report.command, 'string', `${reportPath} command 缺失`);
  assert(report.command.trim().length > 0, `${reportPath} command 不能为空`);
  assert(report.environment && typeof report.environment === 'object', `${reportPath} environment 缺失`);
  assert(report.sourceState && typeof report.sourceState === 'object', `${reportPath} sourceState 缺失`);
  assert.equal(
    report.sourceState.testedPathsDirty,
    false,
    `${reportPath} 生成时 testedPaths 不是干净状态`
  );
  assert(
    Number.isSafeInteger(report.sourceState.testedPathCount)
      && report.sourceState.testedPathCount > 0,
    `${reportPath} testedPathCount 无效`
  );
  assert.equal(
    report.sourceState.statusCheck,
    'git-status-porcelain-v1',
    `${reportPath} sourceState 未通过 Git 状态检查`
  );
  assert(report.summary && typeof report.summary === 'object', `${reportPath} summary 缺失`);
  assert.equal(report.exitCode, 0, `${reportPath} 退出码不是 0`);

  assert.equal(reportEntry.schemaVersion, report.schemaVersion, `${reportPath} manifest schemaVersion 不一致`);
  assert.equal(reportEntry.generatedAt, report.generatedAt, `${reportPath} manifest generatedAt 不一致`);
  assert.equal(reportEntry.gitCommit, report.gitCommit, `${reportPath} manifest gitCommit 不一致`);
  assert.equal(reportEntry.command, report.command, `${reportPath} manifest command 不一致`);
  assert.equal(reportEntry.exitCode, report.exitCode, `${reportPath} manifest exitCode 不一致`);
  assert.deepEqual(reportEntry.sourceState, report.sourceState, `${reportPath} manifest sourceState 不一致`);
  assert.deepEqual(reportEntry.summary, report.summary, `${reportPath} manifest summary 不一致`);
}

const sumsBody = await fs.readFile(sumsPath, 'utf8');
const sumLines = sumsBody.replace(/^\uFEFF/u, '').trim().split(/\r?\n/u);
const sums = new Map();
for (const line of sumLines) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
  assert(match, `SHA256SUMS 行格式错误：${line}`);
  const relative = cleanRelativePath(match[2], 'SHA256SUMS 路径');
  assert(!sums.has(relative), `SHA256SUMS 包含重复路径：${relative}`);
  sums.set(relative, match[1]);
}

const expectedSumFiles = [...allowlist.files, 'DELIVERY-MANIFEST.json'].sort();
assert.deepEqual([...sums.keys()].sort(), expectedSumFiles, 'SHA256SUMS 文件集合不正确');
for (const relative of expectedSumFiles) {
  const body = await fs.readFile(path.join(root, ...relative.split('/')));
  assert.equal(sha256(body), sums.get(relative), `${relative} SHA256SUMS 不一致`);
}

const actualFiles = (await walk(root)).sort();
const expectedFiles = [...expectedSumFiles, 'SHA256SUMS.txt'].sort();
assert.deepEqual(actualFiles, expectedFiles, '解压文件集合与严格白名单不一致');

if (trustedRepo) {
  for (const relative of allowlist.files) {
    const packageBody = await fs.readFile(path.join(root, ...relative.split('/')));
    const { stdout: gitBody } = await git(
      ['cat-file', 'blob', `${manifest.packageCommit}:${relative}`],
      { encoding: 'buffer' }
    );
    assert.deepEqual(
      gitBody,
      packageBody,
      `${relative} 与可信 packageCommit Git tree 不一致`
    );
  }

  try {
    await git([
      'diff',
      '--quiet',
      manifest.testedSourceCommit,
      manifest.packageCommit,
      '--',
      ...allowlist.runtimePaths
    ]);
  } catch (error) {
    assert.fail(
      error?.code === 1
        ? '可信仓库显示 testedSourceCommit 到 packageCommit 的运行时文件已变化'
        : `可信仓库源码差异检查失败：${error?.message || error}`
    );
  }

  process.stdout.write(
    `AUTHENTICATED DELIVERY PASS · ${manifest.files.length} files`
    + ` · package ${manifest.packageShortCommit}`
    + ` · tested ${manifest.testedSourceCommit.slice(0, 8)}\n`
  );
} else {
  process.stdout.write(
    `INTEGRITY PASS · UNAUTHENTICATED · ${manifest.files.length} files`
    + ` · package ${manifest.packageShortCommit}`
    + ` · tested ${manifest.testedSourceCommit.slice(0, 8)}\n`
  );
}
