import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const buildRoot = path.join(repositoryRoot, 'build', 'portable');
const payloadRoot = path.join(buildRoot, 'payload');
const distRoot = path.join(repositoryRoot, 'dist');
const outputName = '个人产品经理工作台.exe';
const outputExe = path.join(distRoot, outputName);
const maxExeBytes = 400 * 1024 * 1024;
const pinned = Object.freeze({
  codex: '0.130.0',
  node: 'v24.12.0',
  postject: '1.0.0-alpha.6',
});

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256Buffer(fs.readFileSync(filename));
}

function pathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function assertSafeBuildRoot() {
  const expected = path.resolve(repositoryRoot, 'build', 'portable');
  if (
    path.resolve(buildRoot) !== expected
    || !pathInside(repositoryRoot, buildRoot)
  ) {
    throw new Error(`Refusing to clean unexpected build directory: ${buildRoot}`);
  }
}

export function validateBuildEnvironment() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Portable workbench must be built on Windows x64');
  }
  if (process.version !== pinned.node) {
    throw new Error(
      `Node ${pinned.node} is required; current version is ${process.version}`,
    );
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

function walkFiles(root) {
  const files = [];
  const visit = current => {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const filename = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic link is forbidden in portable payload: ${filename}`);
      }
      if (entry.isDirectory()) {
        visit(filename);
      } else if (entry.isFile()) {
        files.push(filename);
      } else {
        throw new Error(`Unsupported payload entry type: ${filename}`);
      }
    }
  };
  visit(path.resolve(root));
  return files;
}

export function buildManifest({
  codexVersion,
  payloadRoot: manifestPayloadRoot,
  payloadVersion,
  sourceCommit,
}) {
  const files = walkFiles(manifestPayloadRoot)
    .filter(filename => path.basename(filename) !== 'manifest.json')
    .map(filename => {
      const relative = path.relative(manifestPayloadRoot, filename)
        .split(path.sep)
        .join('/');
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

function copyAllowlistedEntry(source, target) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    throw new Error(`Symbolic link is forbidden in portable payload: ${source}`);
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    const entries = fs.readdirSync(source, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      copyAllowlistedEntry(
        path.join(source, entry.name),
        path.join(target, entry.name),
      );
    }
    return;
  }
  if (!stat.isFile()) {
    throw new Error(`Unsupported allowlisted source type: ${source}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function stageAllowlistedPayload() {
  for (const { source, target } of payloadSources()) {
    if (
      typeof source !== 'string'
      || typeof target !== 'string'
      || !target
      || target.includes('\\')
      || path.posix.isAbsolute(target)
      || path.posix.normalize(target) !== target
      || /(^|\/)(?:\.codex|\.workbench-data)(?:\/|$)|auth\.json$/i.test(target)
    ) {
      throw new Error(`Unsafe portable payload mapping: ${source} -> ${target}`);
    }
    const sourcePath = path.resolve(repositoryRoot, ...source.split('/'));
    const targetPath = path.resolve(payloadRoot, ...target.split('/'));
    if (
      !pathInside(repositoryRoot, sourcePath)
      || !pathInside(payloadRoot, targetPath)
    ) {
      throw new Error(`Portable payload mapping escaped its root: ${source}`);
    }
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Allowlisted portable payload source is missing: ${source}`);
    }
    copyAllowlistedEntry(sourcePath, targetPath);
  }
}

function resolvePinnedCodexFiles() {
  const codexPackage = require.resolve('@openai/codex/package.json');
  const nativePackage = require.resolve(
    '@openai/codex-win32-x64/package.json',
    { paths: [path.dirname(codexPackage)] },
  );
  const codexMetadata = JSON.parse(fs.readFileSync(codexPackage, 'utf8'));
  const nativeMetadata = JSON.parse(fs.readFileSync(nativePackage, 'utf8'));
  if (codexMetadata.version !== pinned.codex) {
    throw new Error(
      `Installed Codex version is ${codexMetadata.version}; expected ${pinned.codex}`,
    );
  }
  if (nativeMetadata.version !== `${pinned.codex}-win32-x64`) {
    throw new Error(
      `Installed native Codex version is ${nativeMetadata.version}; `
        + `expected ${pinned.codex}-win32-x64`,
    );
  }
  const vendorRoot = path.join(
    path.dirname(nativePackage),
    'vendor',
    'x86_64-pc-windows-msvc',
  );
  return [
    {
      source: path.join(vendorRoot, 'codex', 'codex.exe'),
      target: path.join(payloadRoot, 'codex', 'codex.exe'),
    },
    {
      source: path.join(vendorRoot, 'codex', 'codex-windows-sandbox-setup.exe'),
      target: path.join(payloadRoot, 'codex', 'codex-windows-sandbox-setup.exe'),
    },
    {
      source: path.join(vendorRoot, 'codex', 'codex-command-runner.exe'),
      target: path.join(payloadRoot, 'codex', 'codex-command-runner.exe'),
    },
    {
      source: path.join(vendorRoot, 'path', 'rg.exe'),
      target: path.join(payloadRoot, 'codex', 'rg.exe'),
    },
  ];
}

function stagePinnedCodex() {
  for (const { source, target } of resolvePinnedCodexFiles()) {
    const stat = fs.statSync(source);
    if (!stat.isFile()) {
      throw new Error(`Pinned Codex binary is missing: ${source}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

async function runExecutable(filename, args, options = {}) {
  return execFile(filename, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
}

export async function readSourceCommit() {
  const { stdout } = await runExecutable('git.exe', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

function payloadVersionFor(commit) {
  const content = walkFiles(payloadRoot)
    .map(filename => {
      const relative = path.relative(payloadRoot, filename).split(path.sep).join('/');
      return `${relative}\0${sha256File(filename)}`;
    })
    .join('\n');
  return `v1-${commit.slice(0, 12)}-${sha256Buffer(content).slice(0, 16)}`;
}

async function compressPayload(archivePath) {
  const payloadWildcard = path.join(payloadRoot, '*');
  await runExecutable(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Compress-Archive -Path $env:WORKBENCH_PAYLOAD_ITEMS '
        + '-DestinationPath $env:WORKBENCH_RUNTIME_ZIP -CompressionLevel Optimal -Force',
    ],
    {
      env: {
        ...process.env,
        WORKBENCH_PAYLOAD_ITEMS: payloadWildcard,
        WORKBENCH_RUNTIME_ZIP: archivePath,
      },
    },
  );
}

function assertPinnedPostject() {
  const packagePath = require.resolve('postject/package.json');
  const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (metadata.version !== pinned.postject) {
    throw new Error(
      `Installed postject version is ${metadata.version}; expected ${pinned.postject}`,
    );
  }
}

export async function main() {
  validateBuildEnvironment();
  assertPinnedPostject();
  assertSafeBuildRoot();

  fs.rmSync(buildRoot, { recursive: true, force: true });
  fs.mkdirSync(payloadRoot, { recursive: true });
  fs.mkdirSync(distRoot, { recursive: true });
  stageAllowlistedPayload();
  stagePinnedCodex();

  const commit = await readSourceCommit();
  const payloadVersion = payloadVersionFor(commit);
  const manifest = buildManifest({
    codexVersion: pinned.codex,
    payloadRoot,
    payloadVersion,
    sourceCommit: commit,
  });
  fs.writeFileSync(
    path.join(payloadRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const archivePath = path.join(buildRoot, 'runtime.zip');
  await compressPayload(archivePath);
  const archiveSha256 = sha256File(archivePath);
  const payloadMetaPath = path.join(buildRoot, 'payload-meta.json');
  fs.writeFileSync(
    payloadMetaPath,
    `${JSON.stringify({ archiveSha256, manifest }, null, 2)}\n`,
    'utf8',
  );

  const seaBlobPath = path.join(buildRoot, 'sea-preparation.blob');
  const seaConfigPath = path.join(buildRoot, 'sea-config.json');
  const seaConfig = {
    main: path.join(repositoryRoot, 'workbench', 'portable', 'sea-entry.cjs'),
    output: seaBlobPath,
    disableExperimentalSEAWarning: true,
    useCodeCache: false,
    useSnapshot: false,
    assets: {
      'runtime.zip': archivePath,
      'payload-meta.json': payloadMetaPath,
    },
  };
  fs.writeFileSync(
    seaConfigPath,
    `${JSON.stringify(seaConfig, null, 2)}\n`,
    'utf8',
  );

  await runExecutable(
    process.execPath,
    ['--experimental-sea-config', seaConfigPath],
  );
  fs.copyFileSync(process.execPath, outputExe);
  await runExecutable(process.execPath, [
    require.resolve('postject/dist/cli.js'),
    outputExe,
    'NODE_SEA_BLOB',
    seaBlobPath,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ]);

  const exeBytes = fs.statSync(outputExe).size;
  if (exeBytes > maxExeBytes) {
    throw new Error('Portable EXE exceeds the 400 MB limit');
  }
  const exeSha256 = sha256File(outputExe);
  fs.writeFileSync(
    `${outputExe}.sha256`,
    `${exeSha256}  ${outputName}\n`,
    'utf8',
  );
  const artifactManifest = {
    artifact: {
      bytes: exeBytes,
      path: `dist/${outputName}`,
      sha256: exeSha256,
      signed: false,
    },
    archiveSha256,
    dependencies: {
      codex: pinned.codex,
      node: pinned.node,
      postject: pinned.postject,
    },
    payload: manifest,
    sourceCommit: commit,
  };
  fs.writeFileSync(
    path.join(distRoot, 'portable-build-manifest.json'),
    `${JSON.stringify(artifactManifest, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(
    `Portable EXE: ${outputExe}\n`
      + `Bytes: ${exeBytes}\n`
      + `SHA-256: ${exeSha256}\n`
      + 'Signed: false\n',
  );
  return artifactManifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
