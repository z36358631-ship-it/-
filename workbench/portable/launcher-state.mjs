import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PROCESS_NONCE_PATTERN } from './constants.mjs';

const SAFE_LOG_FIELDS = new Set([
  'copied',
  'errorCode',
  'executable',
  'path',
  'payloadVersion',
  'pid',
  'port',
  'status',
  'version',
  'workspace',
]);

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function resolveMappedPath(root, mappingPath, description) {
  if (
    typeof mappingPath !== 'string'
    || !mappingPath
    || path.isAbsolute(mappingPath)
  ) {
    throw new Error(`${description} must be a non-empty relative path`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...mappingPath.split('/'));
  if (!isPathInside(resolvedRoot, resolved) || resolved === resolvedRoot) {
    throw new Error(`${description} escaped ${description.includes('source') ? 'runtime' : 'workspace'} root`);
  }
  return resolved;
}

function readJson(filename, fileSystem = fs) {
  try {
    return JSON.parse(fileSystem.readFileSync(filename, 'utf8'));
  } catch {
    return null;
  }
}

function validPid(value) {
  return Number.isInteger(value) && value > 0;
}

function validOwnerNonce(value) {
  return PROCESS_NONCE_PATTERN.test(String(value || ''));
}

function sameOwner(left, right) {
  if (!validPid(left?.pid) || left.pid !== right?.pid) return false;
  const leftHasNonce = validOwnerNonce(left?.ownerNonce);
  const rightHasNonce = validOwnerNonce(right?.ownerNonce);
  if (!leftHasNonce && !rightHasNonce) return true;
  return (
    leftHasNonce
    && rightHasNonce
    && left.ownerNonce === right.ownerNonce
  );
}

function defaultIsPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function createOwnedLock({
  fileSystem,
  lockPath,
  ownerNonceFactory,
  sessionPath,
}) {
  const ownerNonce = ownerNonceFactory();
  if (!validOwnerNonce(ownerNonce)) {
    throw new Error('Portable instance owner nonce must be 64 lowercase hexadecimal characters');
  }
  let handle;
  let created = false;
  try {
    handle = fileSystem.openSync(lockPath, 'wx');
    created = true;
    fileSystem.writeFileSync(handle, JSON.stringify({
      ownerNonce,
      pid: process.pid,
    }));
  } catch (error) {
    if (handle !== undefined) {
      try {
        fileSystem.closeSync(handle);
      } finally {
        if (created) fileSystem.rmSync(lockPath, { force: true });
      }
    }
    throw error;
  }
  return {
    handle,
    lockPath,
    ownerNonce,
    pid: process.pid,
    sessionPath,
    status: 'acquired',
  };
}

function validateCodexSessionsRoot({
  create,
  runtimeRoot,
}) {
  const resolvedRuntime = path.resolve(runtimeRoot);
  const realRuntime = fs.realpathSync(resolvedRuntime);
  const sessionsRoot = path.join(resolvedRuntime, 'codex-sessions');
  if (create) fs.mkdirSync(sessionsRoot, { recursive: true });
  if (!fs.existsSync(sessionsRoot)) {
    return { realRuntime, sessionsRoot };
  }
  const sessionsInfo = fs.lstatSync(sessionsRoot);
  if (sessionsInfo.isSymbolicLink() || !sessionsInfo.isDirectory()) {
    throw new Error('Portable codex-sessions root must not be a junction or symlink');
  }
  if (!isPathInside(realRuntime, fs.realpathSync(sessionsRoot))) {
    throw new Error('Portable codex-sessions root escaped runtime root');
  }
  return { realRuntime, sessionsRoot };
}

export function createPortableCodexCommand({
  codexRoot,
  nonce,
  runtimeRoot,
}) {
  if (!PROCESS_NONCE_PATTERN.test(String(nonce || ''))) {
    throw new Error('Portable Codex nonce must be 64 lowercase hexadecimal characters');
  }
  const resolvedRuntime = path.resolve(runtimeRoot);
  const resolvedCodex = path.resolve(codexRoot);
  const realRuntime = fs.realpathSync(resolvedRuntime);
  const realCodex = fs.realpathSync(resolvedCodex);
  if (
    !isPathInside(resolvedRuntime, resolvedCodex)
    || resolvedCodex === resolvedRuntime
    || !isPathInside(realRuntime, realCodex)
    || realCodex === realRuntime
  ) {
    throw new Error('Portable Codex root escaped runtime root');
  }
  const directCommand = path.join(resolvedCodex, 'codex.exe');
  if (!fs.statSync(directCommand).isFile()) {
    throw new Error('Portable codex.exe is missing');
  }

  const { sessionsRoot } = validateCodexSessionsRoot({
    create: true,
    runtimeRoot: resolvedRuntime,
  });
  const sessionRoot = path.join(sessionsRoot, nonce);
  if (!isPathInside(resolvedRuntime, sessionRoot)) {
    throw new Error('Portable Codex session path escaped runtime root');
  }
  if (!fs.existsSync(sessionRoot)) {
    fs.symlinkSync(resolvedCodex, sessionRoot, 'junction');
  } else if (fs.realpathSync(sessionRoot) !== realCodex) {
    throw new Error('Portable Codex session junction points to an unexpected target');
  }
  const command = path.join(sessionRoot, 'codex.exe');
  if (!fs.statSync(command).isFile()) {
    throw new Error('Portable codex.exe is missing');
  }
  return command;
}

export function removePortableCodexCommand({
  nonce,
  runtimeRoot,
}) {
  if (!PROCESS_NONCE_PATTERN.test(String(nonce || ''))) {
    throw new Error('Portable Codex nonce must be 64 lowercase hexadecimal characters');
  }
  const resolvedRuntime = path.resolve(runtimeRoot);
  const { sessionsRoot } = validateCodexSessionsRoot({
    create: false,
    runtimeRoot: resolvedRuntime,
  });
  const sessionRoot = path.join(sessionsRoot, nonce);
  if (!isPathInside(resolvedRuntime, sessionRoot)) {
    throw new Error('Portable Codex session path escaped runtime root');
  }
  if (!fs.existsSync(sessionRoot)) return false;
  if (!fs.lstatSync(sessionRoot).isSymbolicLink()) {
    throw new Error('Portable Codex session path is not a junction');
  }
  fs.unlinkSync(sessionRoot);
  return true;
}

export function writeJsonAtomic(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    fs.renameSync(temporary, filename);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

export function assertWritableWorkspace(workspace) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) {
    throw new Error('所选工作区必须是绝对路径');
  }
  const resolved = path.resolve(workspace);
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error('所选工作区不是文件夹');
  }
  const probe = path.join(
    resolved,
    `.personal-codex-workbench-write-${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
  );
  try {
    fs.writeFileSync(probe, 'write-test', { flag: 'wx' });
  } catch (error) {
    throw new Error(`所选工作区不可写：${error.message}`);
  } finally {
    fs.rmSync(probe, { force: true });
  }
  return resolved;
}

export async function loadWorkspace({ appRoot, chooseFolder }) {
  const settingsPath = path.join(appRoot, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return assertWritableWorkspace(saved.workspace);
    } catch {
      // An invalid saved path intentionally returns to the explicit chooser.
    }
  }
  const selected = await chooseFolder();
  if (!selected) return null;
  const workspace = assertWritableWorkspace(selected);
  writeJsonAtomic(settingsPath, { workspace });
  return workspace;
}

export function copyMissingSeeds({
  mappings,
  runtimePath,
  workspace,
}) {
  const copied = [];
  const realRuntime = fs.realpathSync(runtimePath);
  const realWorkspace = fs.realpathSync(workspace);
  for (const mapping of mappings) {
    const source = resolveMappedPath(runtimePath, mapping.source, 'seed source');
    const target = resolveMappedPath(workspace, mapping.target, 'seed target');
    const realSource = fs.realpathSync(source);
    if (!isPathInside(realRuntime, realSource)) {
      throw new Error('seed source escaped runtime root');
    }
    let existingTargetParent = path.dirname(target);
    while (!fs.existsSync(existingTargetParent)) {
      const parent = path.dirname(existingTargetParent);
      if (parent === existingTargetParent) {
        throw new Error('seed target escaped workspace root');
      }
      existingTargetParent = parent;
    }
    if (
      !isPathInside(
        realWorkspace,
        fs.realpathSync(existingTargetParent),
      )
    ) {
      throw new Error('seed target escaped workspace root');
    }
    if (fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (
      !isPathInside(
        realWorkspace,
        fs.realpathSync(path.dirname(target)),
      )
    ) {
      throw new Error('seed target escaped workspace root');
    }
    try {
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      copied.push(mapping.target);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  return copied;
}

export function createLauncherLogger(filename) {
  const write = (level, message, fields = {}) => {
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([key]) => SAFE_LOG_FIELDS.has(key)),
    );
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.appendFileSync(
      filename,
      `${new Date().toISOString()} ${level} ${message} ${JSON.stringify(safeFields)}\n`,
      'utf8',
    );
  };
  return Object.freeze({
    error: (message, fields) => write('ERROR', message, fields),
    info: (message, fields) => write('INFO', message, fields),
  });
}

export async function checkBrokerHealth(session, fetchImpl = fetch) {
  if (
    !Number.isInteger(session?.port)
    || session.port < 1
    || session.port > 65535
    || !PROCESS_NONCE_PATTERN.test(String(session?.token || ''))
  ) {
    return false;
  }
  const origin = `http://127.0.0.1:${session.port}`;
  try {
    const response = await fetchImpl(`${origin}/api/bootstrap`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        Origin: origin,
      },
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function acquireInstance({
  appRoot,
  beforeStaleClaim = async () => {},
  claimNonceFactory = () => crypto.randomBytes(8).toString('hex'),
  checkHealth = checkBrokerHealth,
  fileSystem = fs,
  isPidAlive = defaultIsPidAlive,
  ownerNonceFactory = () => crypto.randomBytes(32).toString('hex'),
}) {
  fileSystem.mkdirSync(appRoot, { recursive: true });
  const lockPath = path.join(appRoot, 'instance.lock');
  const sessionPath = path.join(appRoot, 'session.json');
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return createOwnedLock({
        fileSystem,
        lockPath,
        ownerNonceFactory,
        sessionPath,
      });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }

    const lock = readJson(lockPath, fileSystem);
    const session = readJson(sessionPath, fileSystem);
    if (!lock || !validPid(lock.pid)) {
      throw new Error('旧工作台锁文件无法验证；为避免接管正在启动的进程，本次启动已停止');
    }

    if (
      session
      && sameOwner(lock, session)
      && await checkHealth(session)
    ) {
      return { session, status: 'reused' };
    }

    const lockIsAlive = isPidAlive(lock.pid);
    const sessionIsAlive = (
      validPid(session?.pid)
      && session.pid !== lock.pid
      && isPidAlive(session.pid)
    );
    if (lockIsAlive && !session) {
      throw new Error('旧工作台进程仍在运行但会话尚未就绪；请稍候重试，本次启动已停止');
    }
    if (lockIsAlive || sessionIsAlive) {
      throw new Error('旧工作台进程仍在运行但健康检查失败；为避免接管错误进程，本次启动已停止');
    }

    const claimNonce = String(claimNonceFactory());
    if (!/^[a-f0-9]{16}$/.test(claimNonce)) {
      throw new Error('Portable stale-lock claim nonce must be 16 lowercase hexadecimal characters');
    }
    const claimOwner = validOwnerNonce(lock.ownerNonce)
      ? lock.ownerNonce
      : 'legacy';
    const claimPath = path.join(
      appRoot,
      `instance.lock.claim-${claimOwner}-${lock.pid}-${claimNonce}`,
    );
    await beforeStaleClaim({ claimPath, lock: { ...lock } });

    const currentLock = readJson(lockPath, fileSystem);
    if (!sameOwner(currentLock, lock)) continue;
    try {
      fileSystem.renameSync(lockPath, claimPath);
    } catch (error) {
      if (['EACCES', 'EBUSY', 'EEXIST', 'ENOENT', 'EPERM'].includes(error.code)) {
        continue;
      }
      throw error;
    }

    const claimedLock = readJson(claimPath, fileSystem);
    if (!sameOwner(claimedLock, lock)) {
      try {
        fileSystem.linkSync(claimPath, lockPath);
        fileSystem.rmSync(claimPath, { force: true });
      } catch {
        // A changed lock cannot be safely restored over a new contender.
      }
      continue;
    }
    if (isPidAlive(claimedLock.pid)) {
      try {
        fileSystem.linkSync(claimPath, lockPath);
        fileSystem.rmSync(claimPath, { force: true });
      } catch {
        // Preserve the claim for diagnosis if restoration is ambiguous.
      }
      throw new Error('旧工作台进程在接管期间恢复运行；为避免并发实例，本次启动已停止');
    }

    const claimedSession = readJson(sessionPath, fileSystem);
    if (
      claimedSession
      && session
      && sameOwner(claimedSession, session)
    ) {
      fileSystem.rmSync(sessionPath, { force: true });
    }
    try {
      const acquired = createOwnedLock({
        fileSystem,
        lockPath,
        ownerNonceFactory,
        sessionPath,
      });
      fileSystem.rmSync(claimPath, { force: true });
      return acquired;
    } catch (error) {
      if (error.code === 'EEXIST') {
        fileSystem.rmSync(claimPath, { force: true });
        continue;
      }
      try {
        fileSystem.linkSync(claimPath, lockPath);
        fileSystem.rmSync(claimPath, { force: true });
      } catch {
        // Preserve the claim for diagnosis if restoration is ambiguous.
      }
      throw error;
    }
  }
  throw new Error('工作台实例锁在接管期间持续变化；为避免并发实例，本次启动已停止');
}

export function releaseInstance(instance) {
  if (!instance) return;
  if (instance.handle !== undefined) {
    fs.closeSync(instance.handle);
  }
  const lock = readJson(instance.lockPath);
  const expected = {
    ownerNonce: instance.ownerNonce,
    pid: instance.pid ?? process.pid,
  };
  if (!sameOwner(lock, expected)) return;

  const session = readJson(instance.sessionPath);
  if (session && !sameOwner(session, expected)) return;
  if (session) fs.rmSync(instance.sessionPath, { force: true });
  fs.rmSync(instance.lockPath, { force: true });
}
