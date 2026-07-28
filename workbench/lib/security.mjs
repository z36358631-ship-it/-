import fs from 'node:fs';
import path from 'node:path';

function requestError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function isOutside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative);
}

export function assertLocalRequest(request, config, { queryToken = null } = {}) {
  const expectedOrigin = config.origin || config.originForPort(request.socket.localPort);
  const expectedHost = new URL(expectedOrigin).host;
  if (request.headers.host !== expectedHost) {
    throw requestError('Host is not allowed', 403);
  }
  if (request.headers.origin && request.headers.origin !== expectedOrigin) {
    throw requestError('Origin is not allowed', 403);
  }
  if (
    !request.headers.origin
    && request.headers['sec-fetch-site']
    && request.headers['sec-fetch-site'] !== 'same-origin'
  ) {
    throw requestError('Request is not same-origin', 403);
  }
  const bearerIsValid = request.headers.authorization === `Bearer ${config.sessionToken}`;
  const queryTokenIsValid = queryToken !== null && queryToken === config.sessionToken;
  if (!bearerIsValid && !queryTokenIsValid) {
    throw requestError('Invalid local session token', 401);
  }
}

export function assertAuthorizedPath(root, candidate) {
  if (typeof candidate !== 'string' || candidate.includes('\0')) {
    throw requestError('Invalid path', 400);
  }
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (isOutside(resolvedRoot, resolvedCandidate)) {
    throw requestError('Path is outside allowed root', 403);
  }

  const canonicalRoot = fs.realpathSync.native(resolvedRoot);
  let existing = resolvedCandidate;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const canonicalExisting = fs.realpathSync.native(existing);
  if (isOutside(canonicalRoot, canonicalExisting)) {
    throw requestError('Path resolves outside allowed root', 403);
  }
  return resolvedCandidate;
}

export async function assertJsonRequest(request, maxBodyBytes) {
  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    throw requestError('Content-Type must be application/json', 415);
  }
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > maxBodyBytes) {
    throw requestError('Request body is too large', 413);
  }
}

export async function readJsonBody(request, maxBodyBytes) {
  await assertJsonRequest(request, maxBodyBytes);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw requestError('Request body is too large', 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw requestError('Request body is not valid JSON', 400);
  }
}
