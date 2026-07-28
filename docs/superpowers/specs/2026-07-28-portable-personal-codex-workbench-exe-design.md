# 个人产品经理工作台便携 EXE 设计

## 1. 背景

个人产品经理工作台当前通过以下命令在本机启动：

```powershell
npm.cmd run workbench:start
```

该方式依赖本机已经安装 Node.js、Codex CLI，并要求用户进入正确目录。目标是交付一个 Windows 单文件 EXE，让用户在没有预装 Node.js 或 Codex CLI 的 Windows 10/11 x64 电脑上也能启动工作台。

Codex 登录凭证不得打包进 EXE。新电脑首次运行需要联网完成一次 Codex 登录，后续直接双击使用。

## 2. 目标

- 生成单个分发文件：`dist/个人产品经理工作台.exe`。
- 支持 Windows 10/11 x64。
- 无需管理员权限。
- 无需预装 Node.js、npm 或 Codex CLI。
- 首次运行引导选择工作区并完成 Codex 登录。
- 后续运行自动复用工作区、运行时缓存和登录状态。
- 双击后自动启动本地工作台并打开默认浏览器。
- 重复双击时复用现有实例，不启动第二个 Broker。
- 不把登录凭证、工作区文档或数据库写入 EXE。
- 不覆盖用户已有工作区文件。

## 3. 非目标

- 首版不支持 Windows ARM64、macOS 或 Linux。
- 首版不实现自动更新。
- 首版不实现托盘图标或完整桌面 GUI。
- 首版不实现多工作区切换界面；更换工作区通过启动器诊断命令或删除本地设置后重新选择。
- 首版不内置用户的 `auth.json`、API Key 或其他凭证。
- 首版不承诺离线完成首次登录。
- 首版不提供代码签名；Windows SmartScreen 可能显示“未知发布者”。

## 4. 交付形态

### 4.1 单文件

最终对用户分发的应用文件只有：

```text
个人产品经理工作台.exe
```

构建和验收可以额外生成 SHA-256、构建清单和测试报告，但这些不是运行依赖。

### 4.2 预估体积

EXE 内包含：

- 固定版本的 Node.js x64 运行时。
- 工作台服务端、前端和启动器代码。
- Codex CLI 0.130.0 Windows x64 原生程序。
- Codex Windows sandbox setup、command runner 和 `rg.exe`。
- 首次工作区需要的两份基础产物。

目标体积不超过 400 MB。预计实际体积为 250–350 MB。

### 4.3 本地状态

单文件 EXE 首次运行后会创建本地状态：

```text
%LOCALAPPDATA%\PersonalCodexWorkbench\
  settings.json
  session.json
  launcher.log
  runtime\
    <payload-version>\
```

Codex 登录状态仍由 Codex CLI 保存在当前 Windows 用户的 `%USERPROFILE%\.codex`。

工作台数据库和文件安全记录仍位于选定工作区：

```text
<workspace>\.workbench-data\
```

因此“单文件”指分发文件只有一个，不表示应用运行后不产生缓存、数据库或设置。

## 5. 推荐架构

### 5.1 Node SEA 启动器

使用 Node.js Single Executable Application（SEA）生成 Windows EXE：

1. 用固定 Node.js 24.12.0 生成 SEA preparation blob。
2. 复制对应的 `node.exe` 作为 EXE 基础。
3. 使用锁定版本的 `postject` 注入 SEA blob。
4. 将压缩运行时作为 SEA asset 注入。
5. 最终 EXE 只依赖 Windows 系统组件。

SEA 主脚本使用 `node:sea.getAsset()` 读取内嵌资源，不假设普通 `require()` 可以读取 SEA 内部文件。

### 5.2 版本化原子解压

首次运行时：

1. 从 SEA asset 读取压缩运行时。
2. 校验压缩包 SHA-256。
3. 写入 `%LOCALAPPDATA%` 下的随机临时目录。
4. 使用 Windows PowerShell `Expand-Archive` 解压。
5. 根据内嵌 manifest 逐文件校验 SHA-256。
6. 校验通过后将临时目录原子改名为版本目录。
7. 失败时不启用半成品目录；下次启动重新解压。

已存在且 manifest 校验通过的版本目录直接复用，不重复解压。

EXE 的完整性校验只能发现损坏，不能替代代码签名。未签名版本不宣称发布者身份可信。

### 5.3 运行时内容

版本目录至少包含：

```text
runtime\<payload-version>\
  workbench\
    server.mjs
    lib\
    public\
  starter-workspace\
    docs\superpowers\specs\2026-07-28-personal-codex-workbench-design.md
    demos\产品经理全生命周期工作台demo.html
  codex\
    codex.exe
    codex-windows-sandbox-setup.exe
    codex-command-runner.exe
    rg.exe
  manifest.json
```

Codex 原生文件保持其可执行文件所需的相对目录关系。

## 6. 首次启动流程

### 6.1 工作区选择

若 `settings.json` 没有合法工作区：

1. 调用 Windows PowerShell 和 `System.Windows.Forms.FolderBrowserDialog` 显示文件夹选择器。
2. 明确提示“Codex 只能在你选择的工作区内读取或生成已授权文件”。
3. 用户取消选择时不启动服务、不创建数据库。
4. 用户确认后保存绝对路径到 `settings.json`。

若 EXE 所在目录已经包含 `.workbench-data` 和 `workbench` 开发目录，文件夹选择器默认定位到 EXE 所在目录，但仍由用户确认。

启动器不得把“下载”“桌面”或 EXE 所在目录静默当作工作区。

### 6.2 基础文件

工作区缺少两份种子产物时，从 `starter-workspace` 复制：

- `docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md`
- `demos/产品经理全生命周期工作台demo.html`

复制规则：

- 仅在目标不存在时创建。
- 父目录可以创建。
- 已存在文件不比较、不覆盖、不删除。
- 每次复制记录到 `launcher.log`。

### 6.3 Codex 登录

启动器使用内置 `codex.exe` 执行登录状态检查。

- 已登录：继续启动。
- 未登录：控制窗口显示中文说明，并启动 `codex.exe login`。
- 用户取消或登录失败：不启动工作台，显示错误和日志位置。
- 登录凭证只由 Codex CLI 写入用户目录。

首次登录需要互联网连接。

## 7. 工作台启动流程

### 7.1 可配置 Codex 可执行文件

当前 `CodexAppServerClient` 固定启动 `codex.cmd`。便携版需要支持构造参数：

```js
{
  command: 'C:\\absolute\\runtime\\codex\\codex.exe',
  args: ['app-server'],
  shell: false
}
```

要求：

- `command` 必须是绝对路径。
- `args` 必须是字符串数组。
- 便携模式始终 `shell: false`。
- 进程 nonce 通过 `env` 注入，不拼接到命令字符串。
- 普通开发模式继续兼容 `codex.cmd app-server`。

`createConfig` 从启动器提供的受控环境变量读取便携 Codex 路径，`server.mjs` 将其传入客户端。

### 7.2 动态端口

便携启动器设置：

```text
WORKBENCH_PORT=0
WORKBENCH_ROOT=<selected-workspace>
WORKBENCH_CODEX_COMMAND=<absolute-portable-codex-path>
```

Broker 只监听 `127.0.0.1`。操作系统分配空闲端口，避免与无关程序争用固定端口 4317。

### 7.3 浏览器

服务成功监听后，启动器生成：

```text
http://127.0.0.1:<port>/?token=<64-hex-session-token>
```

要求：

- URL 只能是 loopback HTTP 地址。
- token 必须是服务生成的 256-bit 高熵值，并编码为 64 个十六进制字符。
- 使用 Windows 默认 URL 处理器打开。
- 前端读取 token 后立即从地址栏移除，并只保存在当前浏览器 sessionStorage。

## 8. 单实例与退出

### 8.1 单实例

启动器在 `%LOCALAPPDATA%\PersonalCodexWorkbench` 使用独占创建的锁文件，并保存：

```json
{
  "pid": 1234,
  "port": 54321,
  "token": "<redacted>",
  "workspace": "C:\\workspace",
  "startedAt": "2026-07-28T00:00:00.000Z"
}
```

重复启动时：

1. 读取 session。
2. 使用 session token、精确 Origin 和 loopback 地址调用 `/api/bootstrap`。
3. 验证成功则只打开浏览器，第二个 EXE 退出。
4. 验证失败且 PID 不存在时，将记录视为陈旧状态并重新启动。
5. PID 存在但健康检查失败时不覆盖原记录，显示诊断信息。

仅凭 PID 存在不能认定实例属于工作台。

### 8.2 正常退出

控制窗口显示：

```text
个人产品经理工作台已启动
关闭此窗口或按 Ctrl+C 将停止本地服务
```

收到 SIGINT/SIGTERM 时：

1. 停止 Broker。
2. 停止当前 Codex App Server。
3. 清理属于当前 PID 的 session 和锁。
4. 保留工作区、数据库、设置和运行时缓存。

### 8.3 异常退出

窗口被强制关闭或电脑重启时，依赖现有安全机制：

- Codex PID + 64 位进程 nonce。
- process recovery ledger。
- 只终止命令行和 nonce 都匹配的残留 Codex 进程。
- 正在运行的 Run 标记为 interrupted。
- 不触碰无法证明归属的进程。

下次启动会先完成恢复，再接受新任务。

## 9. 日志与错误处理

启动器同时写入控制窗口和：

```text
%LOCALAPPDATA%\PersonalCodexWorkbench\launcher.log
```

至少覆盖：

- 运行时解压和 manifest 校验。
- 工作区选择与设置读取。
- 种子文件复制。
- Codex 登录状态。
- Broker 地址。
- 浏览器打开结果。
- 重复实例判定。
- 正常和异常退出。

错误必须使用中文说明下一步：

- 运行时损坏：删除损坏缓存并重新解压。
- PowerShell 不可用：显示手动恢复说明并退出。
- 用户取消工作区：正常退出，不标记失败。
- Codex 登录失败：保留缓存和设置，下次继续。
- 工作区不可写：不创建数据库，要求重新选择。
- 浏览器打开失败：显示可手动复制的本地 URL。
- 旧实例异常：显示日志路径，不擅自结束无法证明归属的进程。

日志不得写入 token、Codex auth 内容或文件正文。

## 10. 安全边界

- Broker 固定绑定 `127.0.0.1`。
- API 继续校验 Host、Origin 和 Bearer token。
- EXE 不开放公网监听。
- EXE 不内置用户凭证。
- 工作区必须由用户首次确认。
- 种子文件不覆盖已有文件。
- Codex 子进程使用绝对路径和 `shell: false`。
- 缓存和设置只写入当前 Windows 用户目录。
- 运行时 manifest 包含 Codex 二进制 SHA-256。
- 启动器不自动下载或替换 Codex。
- 首版未签名，交付说明必须明确 SmartScreen 风险。

## 11. 更新与卸载

### 11.1 更新

首版使用手动替换 EXE：

- 新 EXE 使用新的 payload version。
- 新旧运行时目录可以并存。
- 启动成功后可以在后续版本清理旧缓存。
- 更新不得修改 `%USERPROFILE%\.codex`。
- 更新不得覆盖工作区文件或数据库。

首版不实现后台自动更新。

### 11.2 卸载

删除 EXE 不会删除工作区数据。

完全清理运行时和启动器设置时，用户可以删除：

```text
%LOCALAPPDATA%\PersonalCodexWorkbench
```

Codex 登录凭证和工作区需要用户单独决定是否删除。

## 12. 构建产物与可复现性

新增构建入口：

```powershell
npm.cmd run workbench:build-portable
```

构建必须：

- 固定 Node.js、Codex CLI 和 `postject` 版本。
- 从当前源码生成 payload manifest。
- 记录源 Git commit。
- 生成最终 EXE SHA-256。
- 不读取或打包 `%USERPROFILE%\.codex\auth.json`。
- 不读取或打包 `.workbench-data`。
- 不打包用户工作区中的其他文档。
- 对相同源码和固定依赖给出可解释的构建清单。

## 13. 测试与验收

### 13.1 自动化测试

必须覆盖：

1. manifest 生成、SHA-256 校验和损坏拒绝。
2. 临时目录解压失败不会启用半成品。
3. 已验证缓存直接复用。
4. 工作区选择取消。
5. 工作区不可写。
6. 种子文件只创建、不覆盖。
7. 便携 Codex 使用绝对路径、参数数组和 `shell: false`。
8. 开发模式仍能使用 `codex.cmd`。
9. session 健康复用。
10. 陈旧 session 恢复。
11. PID 存在但身份不明时拒绝接管。
12. token 不进入日志。
13. 关闭启动器后 Broker 和当前 Codex 子进程结束。

现有工作台 132 项自动测试必须继续全绿。

### 13.2 构建机冒烟测试

在当前 Windows x64 机器验证：

- EXE 可以读取内嵌 asset。
- EXE 可以原子解压并校验运行时。
- EXE 不调用全局 `node`、`npm` 或 `codex.cmd`。
- EXE 使用内嵌 `codex.exe` 启动 App Server。
- 真实只读 Run、三个 Workflow 和隔离写入恢复继续通过。
- 重复双击只存在一个 Broker。
- 损坏缓存能自动重建。
- 最终候选文件通过工作台恢复。

### 13.3 干净环境验收

发布前在没有安装 Node.js、npm 和 Codex CLI 的 Windows 10/11 x64 环境验证：

1. 双击 EXE。
2. 选择工作区。
3. 完成首次 Codex 登录。
4. 浏览器自动打开工作台。
5. 执行一个只读任务。
6. 关闭并重新双击，确认无需重新安装或重新登录。
7. 重复双击，确认复用同一实例。
8. 强制关闭后重启，确认恢复机制不误杀无关进程。

若当前环境无法提供干净 Windows 虚拟机，交付状态必须标记为“当前机器已验证，干净机待验证”，不得宣称已完成跨机器认证。

## 14. 完成标准

同时满足以下条件才可交付：

- `dist/个人产品经理工作台.exe` 存在。
- EXE 不超过 400 MB。
- EXE 的 SHA-256 已记录。
- 自动测试全部通过。
- 当前机器真实 Codex 链路通过。
- 重复启动、缓存损坏和异常恢复通过。
- EXE 中不包含用户凭证或 `.workbench-data`。
- 相关源码和构建脚本已提交。
- 已明确记录是否完成干净 Windows 环境验收。
- 用户可以只通过双击 EXE 打开工作台，不再手动进入 PowerShell。

## 15. 已知限制

- 未签名 EXE 可能触发 SmartScreen。
- 新电脑首次登录必须联网。
- Codex CLI 版本固定为打包版本，升级需要重新构建 EXE。
- 首版只有控制窗口，没有托盘菜单。
- 用户关闭控制窗口会停止工作台。
- 单文件分发不等于无本地缓存或无用户数据目录。
