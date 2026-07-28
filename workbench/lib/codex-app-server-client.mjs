import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import readline from 'node:readline';

const APP_SERVER_COMMAND = 'codex.cmd';
const APP_SERVER_ARGS = Object.freeze(['app-server']);
const PROCESS_NONCE_NAME = 'PERSONAL_CODEX_WORKBENCH_NONCE';
const PROCESS_NONCE_PATTERN = /^[a-f0-9]{64}$/;
const MAX_DIAGNOSTIC_LENGTH = 16_384;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

function tail(value, length = MAX_DIAGNOSTIC_LENGTH) {
  return String(value || '').slice(-length);
}

export function classifyCodexHealth({ running, stderr = '', launchError = '' }) {
  const diagnostic = [launchError, stderr].filter(Boolean).join('\n');
  const missing = /ENOENT|not recognized|找不到指定的文件/i.test(diagnostic);
  const configError = /service_tier|config\.toml|invalid config|configuration error/i.test(diagnostic);
  const authError = /not logged in|authentication|unauthorized|login required|401/i.test(diagnostic);
  return {
    codex: running ? 'ok' : missing ? 'not-installed' : 'unavailable',
    configuration: configError ? 'error' : running ? 'ok' : 'unknown',
    authentication: authError ? 'error' : running ? 'unknown-until-turn' : 'unknown',
    diagnostic: tail(diagnostic.trim(), 4_000),
  };
}

export class CodexAppServerClient extends EventEmitter {
  constructor({
    args = APP_SERVER_ARGS,
    command = APP_SERVER_COMMAND,
    cwd = process.cwd(),
    shell = process.platform === 'win32',
    spawnProcess = (launchCommand, launchArgs, options) => (
      spawn(launchCommand, launchArgs, options)
    ),
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    nonceFactory = () => crypto.randomBytes(32).toString('hex'),
  } = {}) {
    super();
    if (typeof command !== 'string' || !command.trim()) {
      throw new TypeError('command must be a non-empty string');
    }
    if (!Array.isArray(args) || args.some(value => typeof value !== 'string')) {
      throw new TypeError('args must be an array of strings');
    }
    if (typeof shell !== 'boolean') {
      throw new TypeError('shell must be a boolean');
    }
    if (
      shell === false
      && process.platform === 'win32'
      && !path.win32.isAbsolute(command)
    ) {
      throw new TypeError('shell:false command must be an absolute Windows path');
    }
    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
      throw new TypeError('requestTimeoutMs must be a positive integer');
    }
    this.command = command;
    this.args = Object.freeze([...args]);
    this.shell = Boolean(shell);
    this.cwd = cwd;
    this.spawnProcess = spawnProcess;
    this.requestTimeoutMs = requestTimeoutMs;
    this.nonceFactory = nonceFactory;
    this.processNonce = null;
    this.child = null;
    this.lines = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stderrText = '';
    this.launchErrorText = '';
  }

  async start() {
    if (this.child) return;
    this.stderrText = '';
    this.launchErrorText = '';
    const processNonce = this.nonceFactory();
    if (!PROCESS_NONCE_PATTERN.test(String(processNonce || ''))) {
      throw new Error('Codex process nonce must be 64 lowercase hexadecimal characters');
    }
    this.processNonce = processNonce;

    let child;
    try {
      const launchCommand = this.shell
        ? `set "${PROCESS_NONCE_NAME}=${processNonce}" && `
          + `${this.command} ${this.args.join(' ')}`
        : this.command;
      const launchArgs = this.shell ? [] : [...this.args];
      child = this.spawnProcess(launchCommand, launchArgs, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: this.shell,
        env: {
          ...process.env,
          [PROCESS_NONCE_NAME]: processNonce,
        },
      });
    } catch (error) {
      this.#recordLaunchError(error);
      this.emit('processError', error);
      throw error;
    }

    this.child = child;
    const processPid = Number.isInteger(child.pid) && child.pid > 0
      ? child.pid
      : null;
    const lines = readline.createInterface({ input: child.stdout });
    this.lines = lines;
    lines.on('line', line => this.#receive(line, child));
    child.stderr.on('data', chunk => {
      if (this.child !== child) return;
      const text = chunk.toString('utf8');
      this.stderrText = tail(`${this.stderrText}${text}`);
      this.emit('stderr', text);
    });
    child.on('error', error => {
      const current = this.child === child;
      if (current) this.#recordLaunchError(error);
      this.#rejectPending(error, child);
      if (current) this.child = null;
      if (this.lines === lines) this.lines = null;
      lines.close();
      this.emit('processError', error, {
        current,
        pid: processPid,
        processNonce,
      });
    });
    child.on('exit', (code, signal) => {
      const current = this.child === child;
      const error = new Error(`Codex App Server exited: code=${code} signal=${signal}`);
      this.#rejectPending(error, child);
      if (current) this.child = null;
      if (this.lines === lines) this.lines = null;
      lines.close();
      this.emit('exit', {
        code,
        current,
        pid: processPid,
        processNonce,
        signal,
      });
    });

    try {
      await this.request('initialize', {
        clientInfo: { name: 'personal-product-workbench', version: '0.1.0' },
        capabilities: { experimentalApi: false },
      });
      this.notify('initialized');
    } catch (error) {
      if (this.child === child) await this.stop();
      throw error;
    }
  }

  request(method, params) {
    if (!this.child) return Promise.reject(new Error('Codex App Server is not running'));
    const child = this.child;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiter = this.pending.get(id);
        if (!waiter) return;
        this.pending.delete(id);
        waiter.reject(
          new Error(`Codex App Server request timed out: ${method}`),
        );
      }, this.requestTimeoutMs);
      this.pending.set(id, {
        child,
        method,
        reject,
        resolve,
        timer,
      });
      try {
        this.#write({ id, method, params });
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  notify(method, params) {
    if (!this.child) throw new Error('Codex App Server is not running');
    this.#write(params === undefined ? { method } : { method, params });
  }

  respond(id, result) {
    if (!this.child) throw new Error('Codex App Server is not running');
    this.#write({ id, result });
  }

  respondError(id, code = -32601, message = 'Method not supported', data) {
    if (!this.child) throw new Error('Codex App Server is not running');
    const error = { code, message };
    if (data !== undefined) error.data = data;
    this.#write({ id, error });
  }

  nonce() {
    return this.processNonce;
  }

  diagnostics() {
    return {
      running: Boolean(this.child),
      command: this.command,
      args: [...this.args],
      stderr: this.stderrText,
      launchError: this.launchErrorText,
    };
  }

  async stop() {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    if (this.lines) {
      this.lines.close();
      this.lines = null;
    }
    this.#rejectPending(new Error('Codex App Server stopped'), child);
    child.kill();
  }

  #recordLaunchError(error) {
    this.launchErrorText = tail(
      `${this.launchErrorText}${this.launchErrorText ? '\n' : ''}${error.message}`,
    );
  }

  #rejectPending(error, child) {
    for (const [id, waiter] of this.pending.entries()) {
      if (waiter.child !== child) continue;
      clearTimeout(waiter.timer);
      waiter.reject(error);
      this.pending.delete(id);
    }
  }

  #write(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #receive(line, child) {
    if (this.child !== child) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.emit('protocolError', new Error(`Invalid JSONL from App Server: ${line.slice(0, 200)}`));
      return;
    }
    if (Object.hasOwn(message, 'id') && message.method) {
      this.emit('request', message);
      return;
    }
    if (Object.hasOwn(message, 'id')) {
      const waiter = this.pending.get(message.id);
      if (!waiter || waiter.child !== child) return;
      this.pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) {
        const error = new Error(message.error.message || 'App Server request failed');
        error.code = message.error.code;
        error.data = message.error.data;
        waiter.reject(error);
      } else {
        waiter.resolve(message.result);
      }
      return;
    }
    if (message.method) this.emit('notification', message);
  }
}
