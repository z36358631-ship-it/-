import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createWorkbenchServer } from '../server.mjs';
import { PROCESS_NONCE_PATTERN, SEED_FILES } from './constants.mjs';
import {
  acquireInstance,
  copyMissingSeeds,
  createLauncherLogger,
  createPortableCodexCommand,
  loadWorkspace,
  releaseInstance,
  writeJsonAtomic,
} from './launcher-state.mjs';
import {
  chooseWorkspaceFolder,
  ensureCodexLogin,
  openDefaultBrowser,
} from './windows.mjs';

function sessionUrl(session) {
  if (
    !Number.isInteger(session?.port)
    || session.port < 1
    || session.port > 65535
    || !PROCESS_NONCE_PATTERN.test(String(session?.token || ''))
  ) {
    throw new Error('工作台会话地址无效');
  }
  return `http://127.0.0.1:${session.port}/?token=${encodeURIComponent(session.token)}`;
}

function waitForShutdown() {
  return new Promise(resolve => {
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    const finish = signal => {
      for (const registered of signals) {
        process.off(registered, handlers.get(registered));
      }
      resolve(signal);
    };
    const handlers = new Map(
      signals.map(signal => [signal, () => finish(signal)]),
    );
    for (const signal of signals) {
      process.once(signal, handlers.get(signal));
    }
  });
}

export async function runPortableLauncher({
  appRoot,
  runtimePath,
  dependencies: overrides = {},
}) {
  const dependencies = {
    acquireInstance,
    chooseWorkspaceFolder,
    copyMissingSeeds,
    createLauncherLogger,
    createPortableCodexCommand,
    createWorkbenchServer,
    ensureCodexLogin,
    loadWorkspace,
    openDefaultBrowser,
    print: message => console.log(message),
    releaseInstance,
    waitForShutdown,
    writeJsonAtomic,
    ...overrides,
  };
  const logger = dependencies.createLauncherLogger(
    path.join(appRoot, 'launcher.log'),
  );
  const instance = await dependencies.acquireInstance({ appRoot });
  if (instance.status === 'reused') {
    const url = sessionUrl(instance.session);
    logger.info('复用现有 Broker', { port: instance.session.port });
    try {
      await dependencies.openDefaultBrowser(url);
    } catch {
      logger.error('浏览器自动打开失败', { port: instance.session.port });
      dependencies.print(`浏览器未能自动打开，请复制此地址：${url}`);
    }
    return { status: 'reused', url };
  }

  let app = null;
  let released = false;
  const closeApp = async () => {
    if (!app) return;
    const current = app;
    app = null;
    await current.close();
  };
  const release = () => {
    if (released) return;
    released = true;
    dependencies.releaseInstance(instance);
  };

  try {
    const workspace = await dependencies.loadWorkspace({
      appRoot,
      chooseFolder: () => {
        const executableDirectory = path.dirname(process.execPath);
        const initialDirectory = (
          fs.existsSync(path.join(executableDirectory, '.workbench-data'))
          && fs.existsSync(path.join(executableDirectory, 'workbench'))
        )
          ? executableDirectory
          : '';
        return dependencies.chooseWorkspaceFolder({ initialDirectory });
      },
    });
    if (!workspace) {
      release();
      return { status: 'cancelled' };
    }

    logger.info('工作区已确认', { workspace });
    const copiedSeeds = dependencies.copyMissingSeeds({
      mappings: SEED_FILES,
      runtimePath,
      workspace,
    });
    for (const copied of copiedSeeds) {
      logger.info('已复制种子文件', { path: copied, workspace });
    }
    logger.info('种子文件检查完成', {
      copied: copiedSeeds.length,
      workspace,
    });

    const nonce = crypto.randomBytes(32).toString('hex');
    const codexRoot = path.join(runtimePath, 'codex');
    const codexCommand = dependencies.createPortableCodexCommand({
      codexRoot,
      nonce,
      runtimeRoot: runtimePath,
    });
    await dependencies.ensureCodexLogin(path.join(codexRoot, 'codex.exe'));
    logger.info('Codex 登录状态检查通过');

    app = await dependencies.createWorkbenchServer({
      env: {
        ...process.env,
        WORKBENCH_CODEX_COMMAND: codexCommand,
        WORKBENCH_CODEX_NONCE: nonce,
        WORKBENCH_PORT: '0',
        WORKBENCH_ROOT: workspace,
      },
    });
    await app.listen();
    const port = app.address().port;
    const session = {
      ownerNonce: instance.ownerNonce,
      pid: process.pid,
      port,
      startedAt: new Date().toISOString(),
      token: app.config.sessionToken,
      workspace,
    };
    dependencies.writeJsonAtomic(instance.sessionPath, session);
    logger.info('Broker 已启动', { port, workspace });

    const url = sessionUrl(session);
    try {
      await dependencies.openDefaultBrowser(url);
      logger.info('浏览器已打开', { port });
    } catch {
      logger.error('浏览器自动打开失败', { port });
      dependencies.print(`浏览器未能自动打开，请复制此地址：${url}`);
    }
    dependencies.print('个人产品经理工作台已启动');
    dependencies.print('关闭此窗口或按 Ctrl+C 将停止本地服务');

    await dependencies.waitForShutdown();
    await closeApp();
    release();
    logger.info('Broker 已停止', { port });
    return { status: 'stopped' };
  } finally {
    try {
      await closeApp();
    } finally {
      release();
    }
  }
}
