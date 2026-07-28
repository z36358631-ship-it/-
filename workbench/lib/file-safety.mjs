import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { assertAuthorizedPath } from './security.mjs';

const MAX_TARGETS = 20;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_BYTES / 3) * 4;
const RUN_ID_PATTERN = /^RUN-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function fileError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function conflict(message) {
  return fileError(message, 409);
}

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isMissing(error) {
  return error?.code === 'ENOENT' || error?.code === 'ENOTDIR';
}

function samePath(left, right) {
  return path.relative(path.resolve(left), path.resolve(right)) === '';
}

function assertNoLinkComponents(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  let current = resolvedRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (isMissing(error)) break;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw fileError(`Target path contains a symbolic link or junction: ${current}`);
    }
  }
}

function normalizeRelative(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim() || relativePath.includes('\0')) {
    throw fileError('Target path must be a non-empty relative path');
  }
  if (path.isAbsolute(relativePath)) {
    throw fileError('Target path must be relative');
  }
  const resolvedRoot = path.resolve(root);
  const absolute = assertAuthorizedPath(resolvedRoot, path.resolve(resolvedRoot, relativePath));
  assertNoLinkComponents(resolvedRoot, absolute);
  const normalized = path.relative(resolvedRoot, absolute).split(path.sep).join('/');
  if (!normalized) throw fileError('Target path must identify a file below the allowed root');
  return { path: normalized, absolute };
}

function readState(target) {
  let stat;
  try {
    stat = fs.lstatSync(target.absolute);
  } catch (error) {
    if (isMissing(error)) {
      return {
        path: target.path,
        absolutePath: target.absolute,
        existed: false,
        contentBase64: null,
        hash: null,
      };
    }
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw fileError(`Target is not a regular file: ${target.path}`);
  }
  if (stat.size > MAX_FILE_BYTES) {
    throw fileError(`File exceeds the 10 MB limit: ${target.path}`, 413);
  }
  const content = fs.readFileSync(target.absolute);
  if (content.length > MAX_FILE_BYTES) {
    throw fileError(`File exceeds the 10 MB limit: ${target.path}`, 413);
  }
  return {
    path: target.path,
    absolutePath: target.absolute,
    existed: true,
    contentBase64: content.toString('base64'),
    hash: hash(content),
  };
}

function stateBuffer(state) {
  return state.existed
    ? Buffer.from(state.contentBase64, 'base64')
    : Buffer.alloc(0);
}

function decodeSnapshotContent(item) {
  if (typeof item.contentBase64 !== 'string') {
    throw fileError(`Snapshot content is missing: ${item.path}`);
  }
  if (item.contentBase64.length > MAX_BASE64_LENGTH) {
    throw fileError(`File exceeds the 10 MB limit: ${item.path}`, 413);
  }
  const content = Buffer.from(item.contentBase64, 'base64');
  if (
    content.length > MAX_FILE_BYTES
    || content.toString('base64') !== item.contentBase64
  ) {
    throw fileError(`Snapshot content is invalid or exceeds the 10 MB limit: ${item.path}`);
  }
  if (item.hash !== hash(content)) {
    throw fileError(`Snapshot hash mismatch: ${item.path}`);
  }
  return content;
}

function validateSnapshot(snapshot, allowedRoot) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    throw fileError('Snapshot must contain at least one target file');
  }
  if (snapshot.length > MAX_TARGETS) {
    throw fileError(`A run can target at most ${MAX_TARGETS} files`);
  }
  const seen = new Set();
  return snapshot.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw fileError('Snapshot entries must be objects');
    }
    const target = normalizeRelative(allowedRoot, item.path);
    if (target.path !== item.path) {
      throw fileError(`Snapshot path is not normalized: ${item.path}`);
    }
    const key = process.platform === 'win32' ? item.path.toLowerCase() : item.path;
    if (seen.has(key)) throw fileError(`Snapshot contains a duplicate path: ${item.path}`);
    seen.add(key);
    if (typeof item.existed !== 'boolean') {
      throw fileError(`Snapshot existence flag is invalid: ${item.path}`);
    }
    let content = null;
    if (item.existed) {
      content = decodeSnapshotContent(item);
    } else if (item.contentBase64 !== null || item.hash !== null) {
      throw fileError(`Snapshot for a missing file contains content: ${item.path}`);
    }
    return {
      ...item,
      absolutePath: target.absolute,
      content,
    };
  });
}

function splitLines(text) {
  if (!text) return [];
  const withoutFinalNewline = text.endsWith('\n') ? text.slice(0, -1) : text;
  return withoutFinalNewline.split('\n');
}

function decodedText(buffer) {
  if (buffer.includes(0)) return null;
  try {
    return utf8Decoder.decode(buffer);
  } catch {
    return null;
  }
}

function lineDiff(relativePath, beforeText, afterText) {
  const before = splitLines(beforeText);
  const after = splitLines(afterText);
  let prefix = 0;
  while (
    prefix < before.length
    && prefix < after.length
    && before[prefix] === after[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < before.length - prefix
    && suffix < after.length - prefix
    && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const context = 3;
  const beforeChangeEnd = before.length - suffix;
  const afterChangeEnd = after.length - suffix;
  const beforeStart = Math.max(0, prefix - context);
  const afterStart = Math.max(0, prefix - context);
  const beforeEnd = Math.min(before.length, beforeChangeEnd + context);
  const afterEnd = Math.min(after.length, afterChangeEnd + context);
  const output = [
    `--- a/${relativePath}`,
    `+++ b/${relativePath}`,
    `@@ -${beforeStart + 1},${beforeEnd - beforeStart}`
      + ` +${afterStart + 1},${afterEnd - afterStart} @@`,
  ];
  for (let index = beforeStart; index < prefix; index += 1) {
    output.push(` ${before[index]}`);
  }
  for (let index = prefix; index < beforeChangeEnd; index += 1) {
    output.push(`-${before[index]}`);
  }
  for (let index = prefix; index < afterChangeEnd; index += 1) {
    output.push(`+${after[index]}`);
  }
  for (let offset = Math.min(context, suffix); offset > 0; offset -= 1) {
    output.push(` ${before[before.length - offset]}`);
  }
  return output.join('\n');
}

function writeAtomic(root, relativePath, content) {
  let target = normalizeRelative(root, relativePath);
  fs.mkdirSync(path.dirname(target.absolute), { recursive: true });
  target = normalizeRelative(root, relativePath);
  const temporary = path.join(
    path.dirname(target.absolute),
    `.${path.basename(target.absolute)}.workbench-${crypto.randomUUID()}.tmp`,
  );
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx' });
    fs.renameSync(temporary, target.absolute);
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
}

function changeKey(relativePath) {
  return process.platform === 'win32' ? relativePath.toLowerCase() : relativePath;
}

function expectedChangeKind(before, after) {
  if (!before.existed && after.existed) return 'created';
  if (before.existed && !after.existed) return 'deleted';
  if (before.existed && after.existed && before.hash !== after.hash) return 'modified';
  return null;
}

export class FileSafety {
  constructor({ allowedRoot }) {
    if (typeof allowedRoot !== 'string' || !allowedRoot) {
      throw new TypeError('allowedRoot is required');
    }
    this.allowedRoot = path.resolve(allowedRoot);
    const rootStat = fs.lstatSync(this.allowedRoot);
    if (!rootStat.isDirectory()) throw new TypeError('allowedRoot must be a directory');
    this.stagingBase = path.join(this.allowedRoot, '.workbench-data', 'staging');
  }

  normalizeTargets(paths) {
    if (!Array.isArray(paths)) throw fileError('Target paths must be an array');
    if (paths.length === 0) throw fileError('At least one target file is required');
    if (paths.length > MAX_TARGETS) {
      throw fileError(`A run can target at most ${MAX_TARGETS} files`);
    }
    const unique = new Map();
    for (const value of paths) {
      const target = normalizeRelative(this.allowedRoot, value);
      const key = changeKey(target.path);
      if (!unique.has(key)) unique.set(key, target);
    }
    return [...unique.values()].sort((left, right) => left.path.localeCompare(right.path));
  }

  capture(paths) {
    return this.normalizeTargets(paths).map(readState);
  }

  prepareStaging(runId, snapshot) {
    if (!RUN_ID_PATTERN.test(runId)) throw fileError('Invalid run id for staging');
    const validated = validateSnapshot(snapshot, this.allowedRoot);
    assertAuthorizedPath(this.allowedRoot, this.stagingBase);
    assertNoLinkComponents(this.allowedRoot, this.stagingBase);
    fs.mkdirSync(this.stagingBase, { recursive: true });
    assertNoLinkComponents(this.allowedRoot, this.stagingBase);

    const stagingRoot = path.join(this.stagingBase, runId);
    let alreadyExists = false;
    try {
      const stat = fs.lstatSync(stagingRoot);
      alreadyExists = true;
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw fileError(`Run-scoped staging root is not a directory: ${stagingRoot}`);
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    if (!alreadyExists) fs.mkdirSync(stagingRoot);
    this.#assertStagingRoot(stagingRoot);

    const unexpected = this.findUnexpectedFiles(
      stagingRoot,
      validated.map(item => item.path),
    );
    if (unexpected.length > 0) {
      throw conflict(`Run staging contains unexpected staging entries: ${unexpected.join(', ')}`);
    }

    for (const before of validated) {
      const target = normalizeRelative(stagingRoot, before.path);
      if (before.existed) {
        writeAtomic(stagingRoot, before.path, before.content);
      } else {
        try {
          const stat = fs.lstatSync(target.absolute);
          if (stat.isSymbolicLink() || !stat.isFile()) {
            throw fileError(`Unsupported staging entry: ${target.absolute}`);
          }
          fs.unlinkSync(target.absolute);
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
      }
    }
    return stagingRoot;
  }

  findUnexpectedFiles(stagingRoot, targetPaths) {
    const root = this.#assertStagingRoot(stagingRoot);
    if (!Array.isArray(targetPaths) || targetPaths.length > MAX_TARGETS) {
      throw fileError(`A run can target at most ${MAX_TARGETS} files`);
    }
    const allowedFiles = new Set();
    const allowedDirectories = new Set();
    for (const value of targetPaths) {
      const target = normalizeRelative(root, value);
      allowedFiles.add(changeKey(target.path));
      const parts = target.path.split('/');
      for (let index = 1; index < parts.length; index += 1) {
        allowedDirectories.add(changeKey(parts.slice(0, index).join('/')));
      }
    }

    const found = [];
    const visit = directory => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(root, absolute).split(path.sep).join('/');
        const key = changeKey(relative);
        if (entry.isSymbolicLink()) {
          throw fileError(`Unsupported staging entry: ${absolute}`);
        }
        if (entry.isDirectory()) {
          if (!allowedDirectories.has(key)) {
            found.push(`${relative}/`);
          } else {
            visit(absolute);
          }
        } else if (entry.isFile()) {
          if (!allowedFiles.has(key)) found.push(relative);
        } else {
          throw fileError(`Unsupported staging entry: ${absolute}`);
        }
      }
    };
    visit(root);
    return found.sort();
  }

  compare(snapshot, readRoot = this.allowedRoot) {
    const validated = validateSnapshot(snapshot, this.allowedRoot);
    const root = samePath(readRoot, this.allowedRoot)
      ? this.allowedRoot
      : this.#assertStagingRoot(readRoot);
    return validated.map(before => {
      const after = readState(normalizeRelative(root, before.path));
      if (before.hash === after.hash && before.existed === after.existed) return null;
      const beforeBuffer = before.content || Buffer.alloc(0);
      const afterBuffer = stateBuffer(after);
      const beforeText = decodedText(beforeBuffer);
      const afterText = decodedText(afterBuffer);
      const actualTarget = normalizeRelative(this.allowedRoot, before.path);
      return {
        path: before.path,
        absolutePath: actualTarget.absolute,
        kind: expectedChangeKind(before, after),
        beforeHash: before.hash,
        afterHash: after.hash,
        diff: beforeText === null || afterText === null
          ? 'Binary file changed'
          : lineDiff(before.path, beforeText, afterText),
      };
    }).filter(Boolean);
  }

  applyFromStaging(snapshot, stagedChanges, stagingRoot, onBeforeWrite = () => {}) {
    const validated = validateSnapshot(snapshot, this.allowedRoot);
    const root = this.#assertStagingRoot(stagingRoot);
    const paths = validated.map(item => item.path);
    const unexpected = this.findUnexpectedFiles(root, paths);
    if (unexpected.length > 0) {
      throw conflict(`Run staging contains unexpected staging entries: ${unexpected.join(', ')}`);
    }
    if (typeof onBeforeWrite !== 'function') {
      throw new TypeError('onBeforeWrite must be a function');
    }

    const observed = this.compare(snapshot, root);
    this.#assertChangesMatch(stagedChanges, observed);
    if (observed.some(change => change.kind === 'deleted')) {
      const deleted = observed.find(change => change.kind === 'deleted');
      throw conflict(`Deletion is not applied in the first phase: ${deleted.path}`);
    }

    const beforeByPath = new Map(validated.map(item => [changeKey(item.path), item]));
    const validateForWrite = () => observed.map(change => {
      const before = beforeByPath.get(changeKey(change.path));
      const current = readState(normalizeRelative(this.allowedRoot, change.path));
      if (current.hash !== before.hash || current.existed !== before.existed) {
        throw conflict(`File changed while Codex was running: ${change.path}`);
      }
      const staged = readState(normalizeRelative(root, change.path));
      if (!staged.existed || staged.hash !== change.afterHash) {
        throw conflict(`Staging hash mismatch: ${change.path}`);
      }
      return { change, content: stateBuffer(staged) };
    });

    validateForWrite();
    if (observed.length === 0) return [];
    onBeforeWrite();
    const ready = validateForWrite();
    for (const { change, content } of ready) {
      writeAtomic(this.allowedRoot, change.path, content);
    }
    return this.compare(snapshot);
  }

  assertRestorable(snapshot, changes) {
    this.#restorePlan(snapshot, changes);
  }

  restore(snapshot, changes) {
    const { beforeByPath, restoreEntries } = this.#restorePlan(
      snapshot,
      changes,
    );

    const outcomes = [];
    for (const { change, state } of restoreEntries) {
      const before = beforeByPath.get(changeKey(change.path));
      const current = readState(normalizeRelative(this.allowedRoot, change.path));
      const expectedHash = state === 'already-restored' ? before.hash : change.afterHash;
      const expectedExisted = state === 'already-restored'
        ? before.existed
        : change.afterHash !== null;
      if (current.hash !== expectedHash || current.existed !== expectedExisted) {
        throw conflict(`File changed after this run: ${change.path}`);
      }
      if (state === 'already-restored') {
        outcomes.push({ path: change.path, status: state });
        continue;
      }
      if (!before.existed) {
        fs.unlinkSync(normalizeRelative(this.allowedRoot, change.path).absolute);
      } else {
        writeAtomic(this.allowedRoot, change.path, before.content);
      }
      outcomes.push({ path: change.path, status: 'restored' });
    }
    return outcomes;
  }

  #restorePlan(snapshot, changes) {
    const validated = validateSnapshot(snapshot, this.allowedRoot);
    const beforeByPath = new Map(validated.map(item => [changeKey(item.path), item]));
    const normalizedChanges = this.#validateChanges(changes, beforeByPath);

    const restoreEntries = normalizedChanges.map(change => {
      const before = beforeByPath.get(changeKey(change.path));
      const current = readState(normalizeRelative(this.allowedRoot, change.path));
      const afterExisted = change.afterHash !== null;
      const matchesAfter = current.hash === change.afterHash
        && current.existed === afterExisted;
      const matchesBefore = current.hash === before.hash
        && current.existed === before.existed;
      if (!matchesAfter && !matchesBefore) {
        throw conflict(`File changed after this run: ${change.path}`);
      }
      return {
        change,
        state: matchesBefore ? 'already-restored' : 'needs-restore',
      };
    });
    return { beforeByPath, normalizedChanges, restoreEntries };
  }

  #assertStagingRoot(stagingRoot) {
    if (typeof stagingRoot !== 'string' || !stagingRoot) {
      throw fileError('A run-scoped staging root is required');
    }
    const resolved = path.resolve(stagingRoot);
    if (
      !samePath(path.dirname(resolved), this.stagingBase)
      || !RUN_ID_PATTERN.test(path.basename(resolved))
    ) {
      throw fileError('Path is not a run-scoped staging root');
    }
    assertAuthorizedPath(this.allowedRoot, resolved);
    assertNoLinkComponents(this.allowedRoot, resolved);
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw fileError('Path is not a run-scoped staging root');
    }
    return resolved;
  }

  #assertChangesMatch(provided, observed) {
    if (!Array.isArray(provided)) throw fileError('Staged changes must be an array');
    const observedByPath = new Map(observed.map(item => [changeKey(item.path), item]));
    if (provided.length !== observed.length) {
      throw conflict('Staging change set mismatch');
    }
    const seen = new Set();
    for (const change of provided) {
      if (!change || typeof change !== 'object' || Array.isArray(change)) {
        throw fileError('Staged change entries must be objects');
      }
      if (typeof change.path !== 'string') {
        throw fileError('Staged change path must be a string');
      }
      const key = changeKey(change.path);
      if (seen.has(key)) throw conflict(`Duplicate staged change: ${change.path}`);
      seen.add(key);
      const actual = observedByPath.get(key);
      if (
        actual
        && actual.path === change.path
        && actual.kind === change.kind
        && actual.beforeHash === change.beforeHash
        && actual.afterHash !== change.afterHash
      ) {
        throw conflict(`Staging hash mismatch: ${change.path}`);
      }
      if (
        !actual
        || actual.path !== change.path
        || actual.kind !== change.kind
        || actual.beforeHash !== change.beforeHash
        || actual.afterHash !== change.afterHash
      ) {
        throw conflict(`Staging change mismatch: ${change.path}`);
      }
    }
  }

  #validateChanges(changes, beforeByPath) {
    if (!Array.isArray(changes)) throw fileError('Changes must be an array');
    if (changes.length > beforeByPath.size) throw fileError('Too many changes for snapshot');
    const seen = new Set();
    return changes.map(change => {
      if (!change || typeof change !== 'object' || Array.isArray(change)) {
        throw fileError('Change entries must be objects');
      }
      const target = normalizeRelative(this.allowedRoot, change.path);
      if (target.path !== change.path) {
        throw fileError(`Change path is not normalized: ${change.path}`);
      }
      const key = changeKey(change.path);
      if (seen.has(key)) throw fileError(`Duplicate change path: ${change.path}`);
      seen.add(key);
      const before = beforeByPath.get(key);
      if (!before) throw fileError(`Snapshot does not include ${change.path}`);
      if (change.beforeHash !== before.hash) {
        throw fileError(`Change before hash mismatch: ${change.path}`);
      }
      const afterExisted = change.afterHash !== null;
      const expectedKind = !before.existed && afterExisted
        ? 'created'
        : before.existed && !afterExisted
          ? 'deleted'
          : before.existed && afterExisted
            ? 'modified'
            : null;
      if (!expectedKind || change.kind !== expectedKind) {
        throw fileError(`Change kind is invalid: ${change.path}`);
      }
      if (afterExisted && !/^[a-f0-9]{64}$/.test(change.afterHash)) {
        throw fileError(`Change after hash is invalid: ${change.path}`);
      }
      return { ...change, absolutePath: target.absolute };
    });
  }
}
