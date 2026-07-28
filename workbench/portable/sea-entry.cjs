'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
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
    || path.posix.normalize(relativePath) !== relativePath
  ) {
    throw new Error(`Invalid manifest path: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, ...relativePath.split('/'));
  const relative = path.relative(resolvedRoot, candidate);
  if (
    relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error(`Manifest path escaped runtime root: ${relativePath}`);
  }
  return candidate;
}

function assertNoSymbolicLinks(root, relativePath) {
  let current = path.resolve(root);
  const segments = relativePath.split('/');
  for (let index = -1; index < segments.length; index += 1) {
    if (index >= 0) current = path.join(current, segments[index]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Runtime manifest path contains a symbolic link or junction: ${relativePath}`,
      );
    }
  }
}

function verifyRuntimeManifest(runtimePath, manifest) {
  if (
    !manifest
    || typeof manifest.payloadVersion !== 'string'
    || !manifest.payloadVersion
    || !Array.isArray(manifest.files)
  ) {
    throw new Error('Runtime manifest is invalid');
  }
  const seen = new Set();
  for (const entry of manifest.files) {
    if (
      !entry
      || !Number.isSafeInteger(entry.bytes)
      || entry.bytes < 0
      || !/^[a-f0-9]{64}$/.test(String(entry.sha256 || ''))
    ) {
      throw new Error(`Runtime manifest entry is invalid: ${entry?.path}`);
    }
    const filename = safePayloadPath(runtimePath, entry.path);
    assertNoSymbolicLinks(runtimePath, entry.path);
    if (seen.has(filename)) {
      throw new Error(`Runtime manifest contains a duplicate path: ${entry.path}`);
    }
    seen.add(filename);
    const stat = fs.statSync(filename);
    if (!stat.isFile() || stat.size !== entry.bytes) {
      throw new Error(`Runtime file size mismatch: ${entry.path}`);
    }
    if (hashFile(filename) !== entry.sha256) {
      throw new Error(`Runtime file hash mismatch: ${entry.path}`);
    }
  }
}

const TRANSIENT_MANIFEST_ERROR_CODES = new Set([
  'EACCES',
  'EBUSY',
  'ENOENT',
  'EPERM',
]);

function monotonicMilliseconds() {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

async function verifyRuntimeManifestWithRetry(
  runtimePath,
  manifest,
  {
    delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
    now = monotonicMilliseconds,
    retryDelayMs = 50,
    timeoutMs = 2_000,
    verifyManifest = verifyRuntimeManifest,
  } = {},
) {
  if (
    !Number.isFinite(timeoutMs)
    || timeoutMs < 0
    || !Number.isFinite(retryDelayMs)
    || retryDelayMs <= 0
  ) {
    throw new Error('Runtime manifest retry timing is invalid');
  }
  const deadline = now() + timeoutMs;
  while (true) {
    try {
      return verifyManifest(runtimePath, manifest);
    } catch (error) {
      if (!TRANSIENT_MANIFEST_ERROR_CODES.has(error?.code)) throw error;
      const remaining = deadline - now();
      if (remaining <= 0) throw error;
      await delay(Math.min(retryDelayMs, remaining));
    }
  }
}

async function ensureRuntimeCache({
  archive,
  archiveSha256,
  expandArchive,
  manifest,
  payloadVersion,
  renameRuntime = fs.renameSync,
  runtimeRoot,
  verifyManifest = verifyRuntimeManifest,
}) {
  if (!/^[a-zA-Z0-9._-]+$/.test(String(payloadVersion || ''))) {
    throw new Error('Payload version contains unsafe path characters');
  }
  if (!Buffer.isBuffer(archive) || hashBuffer(archive) !== archiveSha256) {
    throw new Error('Embedded runtime archive SHA-256 mismatch');
  }
  if (manifest?.payloadVersion !== payloadVersion) {
    throw new Error('Runtime manifest payload version mismatch');
  }
  if (typeof expandArchive !== 'function') {
    throw new Error('Runtime archive expansion function is unavailable');
  }

  fs.mkdirSync(runtimeRoot, { recursive: true });
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const target = path.join(resolvedRuntimeRoot, payloadVersion);
  if (fs.existsSync(target)) {
    try {
      await verifyRuntimeManifestWithRetry(target, manifest, { verifyManifest });
      return target;
    } catch {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  const temporary = createTemporaryRuntimePath(resolvedRuntimeRoot);
  try {
    await expandArchive(temporary, archive);
    await verifyRuntimeManifestWithRetry(temporary, manifest, { verifyManifest });
    try {
      renameRuntime(temporary, target);
    } catch (error) {
      if (
        !['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES'].includes(error.code)
      ) {
        throw error;
      }
      try {
        await verifyRuntimeManifestWithRetry(target, manifest, { verifyManifest });
      } catch {
        throw error;
      }
    }
    return target;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function createTemporaryArchivePath(
  appRoot,
  payloadVersion,
  {
    pid = process.pid,
    randomBytes = crypto.randomBytes,
  } = {},
) {
  if (!/^[a-zA-Z0-9._-]+$/.test(String(payloadVersion || ''))) {
    throw new Error('Payload version contains unsafe path characters');
  }
  return path.join(
    appRoot,
    `runtime-${payloadVersion}-${pid}-${randomBytes(8).toString('hex')}.zip`,
  );
}

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

function redactStartupMessage(value) {
  return String(value || 'Unknown startup failure')
    .replace(/\bauth\.json\b/gi, '[redacted-file]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /\b(token|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]',
    )
    .replace(/\b[a-f0-9]{64}\b/gi, '[redacted-hex]');
}

function writeStartupFailure(appRoot, error) {
  if (!appRoot) return;
  const name = String(error?.name || 'Error').replace(/[^a-zA-Z0-9._-]/g, '_');
  const code = String(error?.code || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const message = redactStartupMessage(error?.message);
  fs.mkdirSync(appRoot, { recursive: true });
  fs.appendFileSync(
    path.join(appRoot, 'launcher.log'),
    `${new Date().toISOString()} ERROR SEA startup failed `
      + `${JSON.stringify({ code, message, name })}\n`,
    'utf8',
  );
}

async function expandRuntimeArchive({
  archive,
  archiveFile,
  closeArchive = descriptor => fs.closeSync(descriptor),
  destination,
  execFile = require('node:child_process').execFile,
  openArchive = filename => fs.openSync(filename, 'wx'),
  removeArchive = filename => fs.rmSync(filename, { force: true }),
  writeArchive = (descriptor, value) => fs.writeFileSync(descriptor, value),
}) {
  let archiveDescriptor;
  let ownsArchive = false;
  let primaryError;
  let hasPrimaryError = false;
  const cleanupErrors = [];
  const closeOpenArchive = () => {
    if (archiveDescriptor === undefined) return;
    closeArchive(archiveDescriptor);
    archiveDescriptor = undefined;
  };
  const attachCleanupErrors = (error, errors) => {
    if (
      errors.length === 0
      || error === null
      || !['function', 'object'].includes(typeof error)
    ) {
      return;
    }
    try {
      const existing = Array.isArray(error.cleanupErrors)
        ? error.cleanupErrors
        : [];
      error.cleanupErrors = [...existing, ...errors];
    } catch {
      // Cleanup diagnostics must never replace the error being reported.
    }
  };
  try {
    archiveDescriptor = openArchive(archiveFile);
    ownsArchive = true;
    writeArchive(archiveDescriptor, archive);
    closeOpenArchive();
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
  } catch (error) {
    primaryError = error;
    hasPrimaryError = true;
  } finally {
    if (archiveDescriptor !== undefined) {
      try {
        closeOpenArchive();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (ownsArchive) {
      try {
        removeArchive(archiveFile);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  }
  if (hasPrimaryError) {
    attachCleanupErrors(primaryError, cleanupErrors);
    throw primaryError;
  }
  if (cleanupErrors.length > 0) {
    const [cleanupError, ...additionalCleanupErrors] = cleanupErrors;
    attachCleanupErrors(cleanupError, additionalCleanupErrors);
    throw cleanupError;
  }
}

async function runSea({
  getAsset = require('node:sea').getAsset,
  localAppData = process.env.LOCALAPPDATA,
} = {}) {
  if (!localAppData) throw new Error('LOCALAPPDATA is unavailable');

  const archive = Buffer.from(getAsset('runtime.zip'));
  const meta = JSON.parse(
    Buffer.from(getAsset('payload-meta.json')).toString('utf8'),
  );
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
  const archiveFile = createTemporaryArchivePath(
    appRoot,
    manifest.payloadVersion,
  );
  const expandArchive = destination => expandRuntimeArchive({
    archive,
    archiveFile,
    destination,
  });

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

if (require.main === module) {
  runSea().catch(error => {
    try {
      if (process.env.LOCALAPPDATA) {
        writeStartupFailure(
          path.join(process.env.LOCALAPPDATA, 'PersonalCodexWorkbench'),
          error,
        );
      }
    } catch {
      // Console output remains the final fallback if the log itself is unavailable.
    }
    console.error(`个人产品经理工作台启动失败：${redactStartupMessage(error.message)}`);
    console.error('详细日志：%LOCALAPPDATA%\\PersonalCodexWorkbench\\launcher.log');
    process.exitCode = 1;
  });
}
