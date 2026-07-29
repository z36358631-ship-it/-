import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;
const CLEANUP_MINIMUM_LOCK_AGE_MS = 1_000;
const LOCK_OWNER_FILENAME = "owner.json";
const INTEGER_TEXT = /^(?:0|[1-9][0-9]*)\n?$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function requestError(code, detail = "") {
  const error = new Error(`${code}${detail ? `:${detail}` : ""}`);
  error.code = code;
  return error;
}

function resolvedDescriptorPath(descriptorPath) {
  if (typeof descriptorPath !== "string" || descriptorPath.trim().length === 0) {
    throw requestError("AI_DRIVER_DESCRIPTOR_PATH_REQUIRED");
  }
  return path.resolve(descriptorPath);
}

export function driverRequestSequencePaths(descriptorPath) {
  const descriptor = resolvedDescriptorPath(descriptorPath);
  return Object.freeze({
    descriptorPath: descriptor,
    sequencePath: `${descriptor}.sequence.json`,
    framePath: `${descriptor}.frame.json`,
    lockPath: `${descriptor}.sequence.lock`,
  });
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function ownerPath(lockPath) {
  return path.join(lockPath, LOCK_OWNER_FILENAME);
}

function validateOwner(owner) {
  if (
    owner === null
    || typeof owner !== "object"
    || Array.isArray(owner)
    || !Number.isSafeInteger(owner.pid)
    || owner.pid < 1
    || !UUID_PATTERN.test(owner.ownerToken ?? "")
    || !Number.isSafeInteger(owner.createdAt)
    || owner.createdAt < 0
    || Object.keys(owner).some((key) =>
      !["pid", "ownerToken", "createdAt"].includes(key))
  ) {
    throw requestError("AI_DRIVER_SEQUENCE_LOCK_OWNER_INVALID");
  }
  return Object.freeze({ ...owner });
}

async function readOwner(lockPath) {
  let text;
  try {
    text = await readFile(ownerPath(lockPath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw requestError("AI_DRIVER_SEQUENCE_LOCK_OWNER_MISSING");
    }
    throw error;
  }
  try {
    return validateOwner(JSON.parse(text));
  } catch (error) {
    if (error?.code?.startsWith("AI_DRIVER_SEQUENCE_LOCK_OWNER_")) throw error;
    throw requestError("AI_DRIVER_SEQUENCE_LOCK_OWNER_INVALID");
  }
}

async function createOwnedLock(lockPath, {
  now = Date.now,
  randomUUIDImpl = randomUUID,
} = {}) {
  const owner = validateOwner({
    pid: process.pid,
    ownerToken: randomUUIDImpl(),
    createdAt: now(),
  });
  await mkdir(lockPath, { recursive: false });
  await writeFile(ownerPath(lockPath), `${JSON.stringify(owner)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return owner;
}

async function acquireLock(lockPath, {
  timeoutMs = LOCK_TIMEOUT_MS,
  now = Date.now,
  randomUUIDImpl = randomUUID,
} = {}) {
  const deadline = now() + timeoutMs;
  while (true) {
    try {
      return await createOwnedLock(lockPath, { now, randomUUIDImpl });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (now() >= deadline) {
        throw requestError("AI_DRIVER_SEQUENCE_LOCK_TIMEOUT");
      }
      await wait(LOCK_RETRY_MS);
    }
  }
}

async function assertOwnedLock(lockPath, ownerToken) {
  const owner = await readOwner(lockPath);
  if (owner.ownerToken !== ownerToken) {
    throw requestError("AI_DRIVER_SEQUENCE_LOCK_NOT_OWNER");
  }
  return owner;
}

async function releaseOwnedLock(lockPath, ownerToken, {
  randomUUIDImpl = randomUUID,
} = {}) {
  await assertOwnedLock(lockPath, ownerToken);
  const releasePath =
    `${lockPath}.release.${process.pid}.${randomUUIDImpl()}`;
  await rename(lockPath, releasePath);
  const movedOwner = await readOwner(releasePath);
  if (movedOwner.ownerToken !== ownerToken) {
    throw requestError("AI_DRIVER_SEQUENCE_LOCK_NOT_OWNER");
  }
  await rm(releasePath, { recursive: true });
}

function parseIntegerText(text, code) {
  if (!INTEGER_TEXT.test(text)) throw requestError(code);
  const value = Number(text.trimEnd());
  if (!Number.isSafeInteger(value) || value < 0) throw requestError(code);
  return value;
}

async function readIntegerSidecar(target, code) {
  try {
    return {
      exists: true,
      value: parseIntegerText(await readFile(target, "utf8"), code),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, value: 0 };
    throw error;
  }
}

async function readState(sequencePath, framePath) {
  const sequence = await readIntegerSidecar(
    sequencePath,
    "AI_DRIVER_SEQUENCE_STATE_INVALID",
  );
  const frame = await readIntegerSidecar(
    framePath,
    "AI_DRIVER_FRAME_STATE_INVALID",
  );
  if (sequence.exists !== frame.exists) {
    throw requestError("AI_DRIVER_SEQUENCE_SIDECAR_INCOMPLETE");
  }
  return {
    requestSeq: sequence.value,
    frameSeq: frame.value,
  };
}

function temporarySidecarPath(target, randomUUIDImpl = randomUUID) {
  return `${target}.${process.pid}.${randomUUIDImpl()}.tmp`;
}

async function stageIntegerSidecar(target, value, randomUUIDImpl) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw requestError("AI_DRIVER_SEQUENCE_STATE_INVALID");
  }
  const temporaryPath = temporarySidecarPath(target, randomUUIDImpl);
  await writeFile(temporaryPath, `${value}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return temporaryPath;
}

async function writeState(
  sequencePath,
  framePath,
  state,
  randomUUIDImpl = randomUUID,
) {
  const temporaries = [];
  try {
    const sequenceTemporary = await stageIntegerSidecar(
      sequencePath,
      state.requestSeq,
      randomUUIDImpl,
    );
    temporaries.push(sequenceTemporary);
    const frameTemporary = await stageIntegerSidecar(
      framePath,
      state.frameSeq,
      randomUUIDImpl,
    );
    temporaries.push(frameTemporary);
    await rename(sequenceTemporary, sequencePath);
    temporaries.shift();
    await rename(frameTemporary, framePath);
    temporaries.shift();
  } finally {
    await Promise.all(temporaries.map((temporary) =>
      rm(temporary, { force: true }).catch(() => {})));
  }
}

function allocateRequestSequence(state) {
  if (state.requestSeq === Number.MAX_SAFE_INTEGER) {
    throw requestError("AI_DRIVER_SEQUENCE_EXHAUSTED");
  }
  return state.requestSeq + 1;
}

export async function withAllocatedDriverRequest(
  descriptorPath,
  operation,
  dependencies = {},
) {
  if (typeof operation !== "function") {
    throw requestError("AI_DRIVER_SEQUENCE_OPERATION_REQUIRED");
  }
  const { sequencePath, framePath, lockPath } =
    driverRequestSequencePaths(descriptorPath);
  let lockOwner = null;
  try {
    lockOwner = await acquireLock(lockPath, dependencies);
    try {
      await access(resolvedDescriptorPath(descriptorPath));
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw requestError("AI_DRIVER_DESCRIPTOR_UNAVAILABLE");
      }
      throw error;
    }
    const state = await readState(sequencePath, framePath);
    const requestSeq = allocateRequestSequence(state);
    const outcome = await operation(Object.freeze({
      requestSeq,
      frameSeq: state.frameSeq,
    }));
    const hasNextFrameSeq =
      outcome !== null
      && typeof outcome === "object"
      && Object.hasOwn(outcome, "nextFrameSeq");
    const nextFrameSeq = hasNextFrameSeq
      ? outcome.nextFrameSeq
      : state.frameSeq;
    if (!Number.isSafeInteger(nextFrameSeq) || nextFrameSeq < 0) {
      throw requestError("AI_DRIVER_RESPONSE_FRAME_INVALID");
    }
    await writeState(
      sequencePath,
      framePath,
      { requestSeq, frameSeq: nextFrameSeq },
      dependencies.randomUUIDImpl,
    );
    return outcome?.value;
  } finally {
    if (lockOwner) {
      await releaseOwnedLock(
        lockPath,
        lockOwner.ownerToken,
        dependencies,
      );
    }
  }
}

async function removeSidecarTemporaries(target) {
  const directory = path.dirname(target);
  const prefix = `${path.basename(target)}.`;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (
      entry.isFile()
      && entry.name.startsWith(prefix)
      && entry.name.endsWith(".tmp")
    ) {
      await rm(path.join(directory, entry.name), { force: true });
    }
  }
}

function defaultProcessExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw requestError(
      "AI_DRIVER_SEQUENCE_CLEANUP_PROCESS_UNKNOWN",
      error?.code ?? "UNKNOWN",
    );
  }
}

async function lockExists(lockPath) {
  try {
    await readFile(ownerPath(lockPath), "utf8");
    return true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    try {
      const entries = await readdir(lockPath);
      return entries.length >= 0;
    } catch (directoryError) {
      if (directoryError?.code === "ENOENT") return false;
      throw directoryError;
    }
  }
}

async function quarantineDeadLock(lockPath, {
  now = Date.now,
  processExists = defaultProcessExists,
  minimumLockAgeMs = CLEANUP_MINIMUM_LOCK_AGE_MS,
  randomUUIDImpl = randomUUID,
} = {}) {
  const owner = await readOwner(lockPath);
  const age = now() - owner.createdAt;
  if (!Number.isSafeInteger(age) || age < minimumLockAgeMs) {
    throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_LOCK_TOO_YOUNG");
  }
  let exists;
  try {
    exists = await processExists(owner.pid);
  } catch (error) {
    if (error?.code?.startsWith("AI_DRIVER_SEQUENCE_CLEANUP_")) throw error;
    throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_PROCESS_UNKNOWN");
  }
  if (exists !== false) {
    if (exists === true) {
      throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_LOCK_ACTIVE");
    }
    throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_PROCESS_UNKNOWN");
  }
  const confirmed = await readOwner(lockPath);
  if (confirmed.ownerToken !== owner.ownerToken) {
    throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_LOCK_CHANGED");
  }
  const quarantinePath =
    `${lockPath}.cleanup.${process.pid}.${randomUUIDImpl()}`;
  await rename(lockPath, quarantinePath);
  const movedOwner = await readOwner(quarantinePath);
  if (movedOwner.ownerToken !== owner.ownerToken) {
    throw requestError("AI_DRIVER_SEQUENCE_CLEANUP_LOCK_CHANGED");
  }
  await rm(quarantinePath, { recursive: true });
}

export async function cleanupDriverRequestSequence(
  descriptorPath,
  dependencies = {},
) {
  const { sequencePath, framePath, lockPath } =
    driverRequestSequencePaths(descriptorPath);
  if (await lockExists(lockPath)) {
    await quarantineDeadLock(lockPath, dependencies);
  }
  let lockOwner = null;
  try {
    lockOwner = await acquireLock(lockPath, dependencies);
    await rm(sequencePath, { force: true });
    await rm(framePath, { force: true });
    await removeSidecarTemporaries(sequencePath);
    await removeSidecarTemporaries(framePath);
  } finally {
    if (lockOwner) {
      await releaseOwnedLock(
        lockPath,
        lockOwner.ownerToken,
        dependencies,
      );
    }
  }
}
