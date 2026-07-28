import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  classifyCodexHealth,
  CodexAppServerClient,
} from '../../workbench/lib/codex-app-server-client.mjs';

function fakeProcess({ pid = null } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killCount = 0;
  child.kill = () => {
    child.killCount += 1;
    return true;
  };
  return child;
}

function nextTurn() {
  return new Promise(resolve => setImmediate(resolve));
}

test('client launches the fixed app-server command, initializes in order, and routes notifications', async () => {
  const child = fakeProcess();
  const launches = [];
  const writes = [];
  const processNonce = 'a'.repeat(64);
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({
    cwd: 'C:/workspace',
    nonceFactory: () => processNonce,
    spawnProcess: (command, args, options) => {
      launches.push({ command, args, options });
      return child;
    },
  });

  const initializing = client.start();
  await nextTurn();
  assert.equal(writes[0].method, 'initialize');
  assert.equal(Object.hasOwn(writes[0], 'jsonrpc'), false);
  child.stdout.write(`${JSON.stringify({
    id: writes[0].id,
    result: { userAgent: 'test' },
  })}\n`);
  await initializing;

  assert.deepEqual(
    launches[0].command,
    process.platform === 'win32'
      ? `set "PERSONAL_CODEX_WORKBENCH_NONCE=${processNonce}" && codex.cmd app-server`
      : 'codex.cmd',
  );
  assert.deepEqual(launches[0].args, process.platform === 'win32' ? [] : ['app-server']);
  assert.equal(launches[0].options.cwd, 'C:/workspace');
  assert.equal(launches[0].options.shell, process.platform === 'win32');
  assert.equal(
    launches[0].options.env.PERSONAL_CODEX_WORKBENCH_NONCE,
    processNonce,
  );
  assert.equal(client.nonce(), processNonce);
  assert.deepEqual(writes[1], { method: 'initialized' });

  const events = [];
  client.on('notification', value => events.push(value));
  child.stdout.write(`${JSON.stringify({
    method: 'item/agentMessage/delta',
    params: { threadId: 'th-1', turnId: 'tu-1', delta: '你好' },
  })}\n`);
  await nextTurn();
  assert.equal(events[0].method, 'item/agentMessage/delta');
  await client.stop();
});

test('client rejects an invalid internally generated ownership nonce before launch', async () => {
  let launchCount = 0;
  const client = new CodexAppServerClient({
    nonceFactory: () => 'browser-controlled-or-malformed',
    spawnProcess: () => {
      launchCount += 1;
      return fakeProcess();
    },
  });

  await assert.rejects(client.start(), /64 lowercase hexadecimal/);
  assert.equal(launchCount, 0);
  assert.equal(client.diagnostics().running, false);
});

test('client correlates JSONL responses by id and exposes stderr diagnostics', async () => {
  const child = fakeProcess();
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const threadRequests = [];
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
    if (message.method === 'thread/start') threadRequests.push(message);
  });

  await client.start();
  const first = client.request('thread/start', { cwd: 'C:/first' });
  const second = client.request('thread/start', { cwd: 'C:/second' });
  assert.equal(threadRequests.length, 2);
  child.stdout.write(`${JSON.stringify({
    id: threadRequests[1].id,
    result: { thread: { id: 'th-2' } },
  })}\n`);
  child.stdout.write(`${JSON.stringify({
    id: threadRequests[0].id,
    result: { thread: { id: 'th-1' } },
  })}\n`);
  assert.equal((await first).thread.id, 'th-1');
  assert.equal((await second).thread.id, 'th-2');

  child.stderr.write('invalid service_tier');
  assert.match(client.diagnostics().stderr, /service_tier/);
  assert.deepEqual(
    classifyCodexHealth({ running: false, stderr: client.diagnostics().stderr }),
    {
      codex: 'unavailable',
      configuration: 'error',
      authentication: 'unknown',
      diagnostic: 'invalid service_tier',
    },
  );
  await client.stop();
});

test('client emits server requests and responds without a jsonrpc envelope', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const starting = client.start();
  await nextTurn();
  child.stdout.write(`${JSON.stringify({ id: writes[0].id, result: {} })}\n`);
  await starting;

  const requests = [];
  client.on('request', message => requests.push(message));
  const numericRequest = {
    id: 91,
    method: 'item/fileChange/requestApproval',
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-1',
      startedAtMs: 1_754_000_000_000,
    },
  };
  child.stdout.write(`${JSON.stringify(numericRequest)}\n`);
  await nextTurn();
  assert.deepEqual(requests[0], numericRequest);
  client.respond(numericRequest.id, { decision: 'accept' });
  assert.deepEqual(writes.at(-1), {
    id: 91,
    result: { decision: 'accept' },
  });
  assert.equal(Object.hasOwn(writes.at(-1), 'jsonrpc'), false);

  const stringRequest = {
    ...numericRequest,
    id: 'approval-request-92',
    params: { ...numericRequest.params, itemId: 'item-2' },
  };
  child.stdout.write(`${JSON.stringify(stringRequest)}\n`);
  await nextTurn();
  assert.deepEqual(requests[1], stringRequest);
  client.respond(stringRequest.id, { decision: 'decline' });
  assert.deepEqual(writes.at(-1), {
    id: 'approval-request-92',
    result: { decision: 'decline' },
  });
  await client.stop();
});

test('client responds with default and custom protocol error envelopes without jsonrpc', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const starting = client.start();
  await nextTurn();
  child.stdout.write(`${JSON.stringify({ id: writes[0].id, result: {} })}\n`);
  await starting;

  client.respondError(93);
  assert.deepEqual(writes.at(-1), {
    id: 93,
    error: {
      code: -32601,
      message: 'Method not supported',
    },
  });
  assert.equal(Object.hasOwn(writes.at(-1), 'jsonrpc'), false);

  client.respondError(
    'server-request-94',
    -32001,
    'Request denied',
    { reason: 'policy' },
  );
  assert.deepEqual(writes.at(-1), {
    id: 'server-request-94',
    error: {
      code: -32001,
      message: 'Request denied',
      data: { reason: 'policy' },
    },
  });
  assert.equal(Object.hasOwn(writes.at(-1), 'jsonrpc'), false);
  await client.stop();
});

test('client protocol error write failures are synchronous and never retried', async () => {
  const child = fakeProcess();
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  await client.start();

  let writeAttempts = 0;
  child.stdin.write = () => {
    writeAttempts += 1;
    throw new Error('protocol write failed');
  };
  assert.throws(
    () => client.respondError('server-request-write-failure'),
    /protocol write failed/,
  );
  assert.equal(writeAttempts, 1);
  assert.equal(client.pending.size, 0);
  await client.stop();
});

test('client retains launch errors and classifies a missing Codex executable', async () => {
  const child = fakeProcess();
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const starting = client.start();
  child.emit('error', Object.assign(new Error('spawn codex.cmd ENOENT'), { code: 'ENOENT' }));

  await assert.rejects(starting, /ENOENT/);
  assert.deepEqual(client.diagnostics(), {
    running: false,
    command: 'codex.cmd',
    args: ['app-server'],
    stderr: '',
    launchError: 'spawn codex.cmd ENOENT',
  });
  assert.deepEqual(classifyCodexHealth(client.diagnostics()), {
    codex: 'not-installed',
    configuration: 'unknown',
    authentication: 'unknown',
    diagnostic: 'spawn codex.cmd ENOENT',
  });
});

test('initialize has a fixed request deadline and stops only its own child', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({
    requestTimeoutMs: 15,
    spawnProcess: () => child,
  });

  await assert.rejects(
    () => client.start(),
    /request timed out: initialize/,
  );

  assert.equal(writes[0].method, 'initialize');
  assert.equal(child.killCount, 1);
  assert.equal(client.diagnostics().running, false);
  assert.equal(client.pending.size, 0);
});

test('request deadlines identify the method and ignore a late response', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    writes.push(message);
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({
    requestTimeoutMs: 15,
    spawnProcess: () => child,
  });
  await client.start();

  const pending = client.request('thread/start', { cwd: 'C:/workspace' });
  const request = writes.find(message => message.method === 'thread/start');
  await assert.rejects(pending, /request timed out: thread\/start/);
  assert.equal(client.pending.size, 0);

  child.stdout.write(`${JSON.stringify({
    id: request.id,
    result: { thread: { id: 'late-thread' } },
  })}\n`);
  await nextTurn();
  assert.equal(client.pending.size, 0);
  await client.stop();
});

test('process exit rejects pending requests and clears their deadlines', async () => {
  const child = fakeProcess();
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({
    requestTimeoutMs: 100,
    spawnProcess: () => child,
  });
  await client.start();

  const pending = client.request('thread/resume', { threadId: 'thread-1' });
  child.emit('exit', 1, null);

  await assert.rejects(pending, /exited: code=1/);
  assert.equal(client.pending.size, 0);
  assert.equal(client.diagnostics().running, false);
});

test('a stopped child late error and exit cannot reject requests from a restarted child', async () => {
  const firstNonce = '1'.repeat(64);
  const secondNonce = '2'.repeat(64);
  const firstChild = fakeProcess({ pid: 7101 });
  const secondChild = fakeProcess({ pid: 7102 });
  const children = [firstChild, secondChild];
  const nonces = [firstNonce, secondNonce];
  const writesByChild = new Map();
  for (const child of children) {
    const writes = [];
    writesByChild.set(child, writes);
    child.stdin.on('data', chunk => {
      const message = JSON.parse(chunk.toString('utf8'));
      writes.push(message);
      if (message.method === 'initialize') {
        child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
      }
    });
  }
  const client = new CodexAppServerClient({
    nonceFactory: () => nonces.shift(),
    spawnProcess: () => children.shift(),
  });
  const exits = [];
  client.on('exit', info => exits.push(info));

  await client.start();
  await client.stop();
  await client.start();
  const request = client.request('thread/start', { cwd: 'C:/current' });
  const observed = request.then(
    value => ({ status: 'fulfilled', value }),
    error => ({ status: 'rejected', error }),
  );
  const currentRequest = writesByChild.get(secondChild)
    .find(message => message.method === 'thread/start');

  firstChild.emit('error', new Error('late old-child error'));
  firstChild.emit('exit', 0, null);
  secondChild.stdout.write(`${JSON.stringify({
    id: currentRequest.id,
    result: { thread: { id: 'thread-current' } },
  })}\n`);

  const outcome = await observed;
  assert.equal(outcome.status, 'fulfilled');
  assert.equal(outcome.value.thread.id, 'thread-current');
  assert.equal(client.diagnostics().running, true);
  assert.equal(client.diagnostics().launchError, '');
  assert.equal(client.nonce(), secondNonce);
  assert.deepEqual(exits, [{
    code: 0,
    current: false,
    pid: 7101,
    processNonce: firstNonce,
    signal: null,
  }]);
  await client.stop();
});

test('current child exit reports process identity and rejects only its requests', async () => {
  const processNonce = '3'.repeat(64);
  const child = fakeProcess({ pid: 7201 });
  const writes = [];
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    writes.push(message);
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({
    nonceFactory: () => processNonce,
    spawnProcess: () => child,
  });
  const exits = [];
  client.on('exit', info => exits.push(info));
  await client.start();

  const pending = client.request('thread/resume', { threadId: 'thread-current' });
  child.emit('exit', 23, 'SIGTERM');

  await assert.rejects(pending, /exited: code=23 signal=SIGTERM/);
  assert.deepEqual(exits, [{
    code: 23,
    current: true,
    pid: 7201,
    processNonce,
    signal: 'SIGTERM',
  }]);
  assert.equal(client.pending.size, 0);
  assert.equal(client.diagnostics().running, false);
});
