import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  rename,
  rmdir,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

const DEFAULT_CLEANUP_RETRY_DELAYS_MS = Object.freeze([0, 5, 20]);

function waitFor(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function artifactExistsError(target, cause) {
  const error = new Error(`AI_PLAYTEST_ARTIFACT_EXISTS:${target}`, { cause });
  error.code = "AI_PLAYTEST_ARTIFACT_EXISTS";
  return error;
}

function temporaryCleanupError({
  temporary,
  target,
  targetPublished,
  operationError,
  cleanupError,
}) {
  const publicationState = targetPublished ? "PUBLISHED" : "NOT_PUBLISHED";
  const errors = operationError
    ? [operationError, cleanupError]
    : [cleanupError];
  const error = new AggregateError(
    errors,
    `AI_PLAYTEST_TEMP_CLEANUP_FAILED:${publicationState}:${temporary}:${target}`,
    { cause: cleanupError },
  );
  error.code = "AI_PLAYTEST_TEMP_CLEANUP_FAILED";
  error.targetPublished = targetPublished;
  error.temporary = temporary;
  error.target = target;
  error.operationError = operationError ?? null;
  return error;
}

async function cleanupTemporaryFile({
  temporary,
  target,
  targetPublished,
  operationError = null,
  unlinkImpl = unlink,
  cleanupRetryDelaysMs = DEFAULT_CLEANUP_RETRY_DELAYS_MS,
  wait = waitFor,
}) {
  const retryDelays = cleanupRetryDelaysMs.length > 0
    ? cleanupRetryDelaysMs
    : DEFAULT_CLEANUP_RETRY_DELAYS_MS;
  let cleanupError;
  for (const delayMs of retryDelays) {
    if (delayMs > 0) await wait(delayMs);
    try {
      await unlinkImpl(temporary);
      return;
    } catch (error) {
      if (error?.code === "ENOENT") return;
      cleanupError = error;
    }
  }
  throw temporaryCleanupError({
    temporary,
    target,
    targetPublished,
    operationError,
    cleanupError,
  });
}

export async function claimOutputDirectory(output) {
  const parent = path.dirname(output);
  const parentStat = await stat(parent).catch(() => null);
  if (!parentStat?.isDirectory()) {
    throw new Error(`AI_PLAYTEST_OUTPUT_PARENT_MISSING:${parent}`);
  }
  try {
    await mkdir(output, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`AI_PLAYTEST_OUTPUT_EXISTS:${output}`);
    }
    throw error;
  }
}

export async function publishBufferExclusive(target, bytes, {
  randomId = randomUUID,
  openImpl = open,
  linkImpl = link,
  unlinkImpl = unlink,
  cleanupRetryDelaysMs = DEFAULT_CLEANUP_RETRY_DELAYS_MS,
  wait = waitFor,
} = {}) {
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomId()}.tmp`,
  );
  let handle;
  let temporaryCreated = false;
  try {
    handle = await openImpl(temporary, "wx");
    temporaryCreated = true;
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    let operationError = error;
    if (handle) {
      try {
        await handle.close();
      } catch (closeError) {
        operationError = new AggregateError(
          [error, closeError],
          `AI_PLAYTEST_TEMP_CLOSE_FAILED:${temporary}`,
          { cause: error },
        );
      }
    }
    if (temporaryCreated) {
      await cleanupTemporaryFile({
        temporary,
        target,
        targetPublished: false,
        operationError,
        unlinkImpl,
        cleanupRetryDelaysMs,
        wait,
      });
    }
    throw operationError;
  }
  await publishTemporaryFileExclusive(temporary, target, {
    linkImpl,
    unlinkImpl,
    cleanupRetryDelaysMs,
    wait,
  });
}

export async function publishJsonExclusive(target, value) {
  await publishBufferExclusive(
    target,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"),
  );
}

export async function temporaryArtifactPath(
  output,
  basename,
  { randomId = randomUUID } = {},
) {
  return path.join(output, `.${basename}.${randomId()}.tmp`);
}

export async function publishTemporaryFileExclusive(temporary, target, {
  linkImpl = link,
  unlinkImpl = unlink,
  cleanupRetryDelaysMs = DEFAULT_CLEANUP_RETRY_DELAYS_MS,
  wait = waitFor,
} = {}) {
  let targetPublished = false;
  let operationError = null;
  try {
    await linkImpl(temporary, target);
    targetPublished = true;
  } catch (error) {
    operationError = error?.code === "EEXIST"
      ? artifactExistsError(target, error)
      : error;
  }
  await cleanupTemporaryFile({
    temporary,
    target,
    targetPublished,
    operationError,
    unlinkImpl,
    cleanupRetryDelaysMs,
    wait,
  });
  if (operationError) throw operationError;
}

export async function quarantineIncompleteSession({
  output,
  invalidRoot,
  sessionId,
  now = Date.now,
  randomId = randomUUID,
  renameImpl = rename,
  rmdirImpl = rmdir,
}) {
  await mkdir(invalidRoot, { recursive: true });
  const stamp = new Date(now()).toISOString().replaceAll(/[:.]/gu, "-");
  const reservation = path.join(
    invalidRoot,
    `${stamp}-${sessionId}-${randomId()}`,
  );
  try {
    await mkdir(reservation, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`AI_PLAYTEST_QUARANTINE_EXISTS:${reservation}`, {
        cause: error,
      });
    }
    throw error;
  }
  const target = path.join(reservation, path.basename(output));
  try {
    await renameImpl(output, target);
  } catch (error) {
    let operationError = error;
    if (error?.code === "EXDEV") {
      operationError = new Error(
        `AI_PLAYTEST_QUARANTINE_CROSS_DEVICE:${output}:${target}`,
        { cause: error },
      );
      operationError.code = "AI_PLAYTEST_QUARANTINE_CROSS_DEVICE";
    }
    try {
      await rmdirImpl(reservation);
    } catch (cleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        `AI_PLAYTEST_QUARANTINE_RESERVATION_CLEANUP_FAILED:${reservation}`,
        { cause: operationError },
      );
    }
    throw operationError;
  }
  return target;
}
