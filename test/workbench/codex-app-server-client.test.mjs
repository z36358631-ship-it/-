import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  classifyCodexHealth,
  CodexAppServerClient,
} from '../../workbench/lib/codex-app-server-client.mjs';

function fakeProcess() {
  const child = new EventEmitter();
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
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({
    cwd: 'C:/workspace',
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
    process.platform === 'win32' ? 'codex.cmd app-server' : 'codex.cmd',
  );
  assert.deepEqual(launches[0].args, process.platform === 'win32' ? [] : ['app-server']);
  assert.equal(launches[0].options.cwd, 'C:/workspace');
  assert.equal(launches[0].options.shell, process.platform === 'win32');
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
