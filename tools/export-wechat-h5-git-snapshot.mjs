import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
assert.equal(
  process.argv.length,
  5,
  '用法：node tools/export-wechat-h5-git-snapshot.mjs <Git 仓库> <commit> <空目标目录>'
);

const repository = path.resolve(process.argv[2]);
const commit = process.argv[3];
const destination = path.resolve(process.argv[4]);
assert.match(commit, /^[0-9a-f]{40}$/u, 'commit 必须是 40 位 Git SHA');

async function gitBlob(specification) {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repository, 'cat-file', 'blob', specification],
    {
      encoding: 'buffer',
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024
    }
  );
  return stdout;
}

function cleanRelativePath(value) {
  assert.equal(typeof value, 'string', '白名单路径必须是字符串');
  assert(value.length > 0, '白名单路径不能为空');
  assert(!value.includes('\\'), `白名单路径必须使用正斜杠：${value}`);
  assert(!path.posix.isAbsolute(value), `白名单路径不能是绝对路径：${value}`);
  assert.equal(path.posix.normalize(value), value, `白名单路径未规范化：${value}`);
  assert(!value.startsWith('../') && value !== '..', `白名单路径越界：${value}`);
  return value;
}

await fs.mkdir(destination, { recursive: true });
assert.deepEqual(await fs.readdir(destination), [], '目标目录必须为空');

const allowlistRelative = 'tools/wechat-h5-delivery-allowlist.json';
const allowlistBody = await gitBlob(`${commit}:${allowlistRelative}`);
const allowlist = JSON.parse(allowlistBody.toString('utf8').replace(/^\uFEFF/u, ''));
assert.equal(allowlist.schemaVersion, 1, '交付白名单 schemaVersion 必须为 1');
assert(Array.isArray(allowlist.files) && allowlist.files.length > 0, '交付白名单 files 不能为空');
const files = allowlist.files.map(cleanRelativePath);
assert.equal(new Set(files).size, files.length, '交付白名单包含重复路径');
assert.deepEqual([...files].sort(), files, '交付白名单必须按路径排序');
assert(files.includes(allowlistRelative), '交付白名单必须包含自身');

for (const relative of files) {
  const body = relative === allowlistRelative
    ? allowlistBody
    : await gitBlob(`${commit}:${relative}`);
  const absolute = path.join(destination, ...relative.split('/'));
  const escaped = path.relative(destination, absolute);
  assert(!escaped.startsWith('..') && !path.isAbsolute(escaped), `导出路径越界：${relative}`);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, body, { flag: 'wx' });
}

process.stdout.write(`EXPORTED ${files.length} GIT BLOBS FROM ${commit.slice(0, 8)}\n`);
