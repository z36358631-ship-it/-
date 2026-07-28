import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createConfig } from '../../workbench/lib/config.mjs';
import {
  assertAuthorizedPath,
  assertJsonRequest,
  assertLocalRequest,
} from '../../workbench/lib/security.mjs';

test('createConfig fixes host, root, limits and creates a per-process token', () => {
  const root = path.resolve('C:/workspace');
  const config = createConfig({
    WORKBENCH_ROOT: root,
    WORKBENCH_PORT: '4317',
    WORKBENCH_CODEX_ARGS: '-Command arbitrary-command',
  });
  const nextConfig = createConfig({ WORKBENCH_ROOT: root });
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 4317);
  assert.equal(config.allowedRoot, root);
  assert.equal(config.maxBodyBytes, 1_048_576);
  assert.equal(config.maxConcurrentRuns, 1);
  assert.match(config.sessionToken, /^[a-f0-9]{64}$/);
  assert.notEqual(config.sessionToken, nextConfig.sessionToken);
  assert.equal(config.codexCommand, 'codex.cmd');
  assert.deepEqual(config.codexArgs, ['app-server']);
  assert.equal(config.codexShell, process.platform === 'win32');
  assert.equal(config.codexProcessNonce, null);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.codexArgs));
});

test('local request requires exact host, origin and bearer token', () => {
  const config = createConfig({ WORKBENCH_ROOT: path.resolve('C:/workspace') });
  const request = {
    headers: {
      host: '127.0.0.1:4317',
      origin: config.origin,
      authorization: `Bearer ${config.sessionToken}`,
    },
    socket: { localPort: 4317 },
  };
  assert.doesNotThrow(() => assertLocalRequest(request, config));
  assert.throws(
    () => assertLocalRequest({
      ...request,
      headers: { ...request.headers, host: 'localhost:4317' },
    }, config),
    /Host/,
  );
  assert.throws(
    () => assertLocalRequest({
      ...request,
      headers: { ...request.headers, origin: 'https://evil.example' },
    }, config),
    /Origin/,
  );
  assert.throws(
    () => assertLocalRequest({
      ...request,
      headers: {
        host: request.headers.host,
        origin: config.origin,
      },
    }, config),
    /token/,
  );
});

test('authorized path cannot escape the configured root', (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-security-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'root');
  const outside = path.join(fixture, 'outside');
  fs.mkdirSync(path.join(root, 'prd'), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');

  assert.equal(
    assertAuthorizedPath(root, path.join(root, 'prd', 'feature.md')),
    path.resolve(root, 'prd', 'feature.md'),
  );
  assert.throws(
    () => assertAuthorizedPath(root, path.join(root, '..', 'secret.txt')),
    /outside allowed root/,
  );

  const linkedOutside = path.join(root, 'linked-outside');
  fs.symlinkSync(outside, linkedOutside, 'junction');
  assert.throws(
    () => assertAuthorizedPath(root, path.join(linkedOutside, 'secret.txt')),
    /resolves outside allowed root/,
  );
});

test('JSON request rejects non-json and oversized bodies before parsing', async () => {
  await assert.rejects(
    () => assertJsonRequest({ headers: { 'content-type': 'text/plain' } }, 1_048_576),
    /application\/json/,
  );
  await assert.rejects(
    () => assertJsonRequest({
      headers: {
        'content-type': 'application/json',
        'content-length': '1048577',
      },
    }, 1_048_576),
    /too large/,
  );
});
