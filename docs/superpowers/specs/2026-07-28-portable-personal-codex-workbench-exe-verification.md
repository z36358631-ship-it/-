# 个人产品经理工作台便携版 EXE 验证报告

## 结论

当前机器已验证，干净机待验证。

最终便携版 EXE 在当前 Windows x64 机器上通过全量自动化测试、真实 EXE 便携验收和 UI 回归验证。此结论仅覆盖当前机器，不代表已经完成跨机器或干净系统认证。

## 产物信息

| 项目 | 最终值 |
| --- | --- |
| EXE 路径 | `dist/个人产品经理工作台.exe` |
| 文件大小 | `177235968 bytes` |
| 换算大小 | `169.03 MiB`（按 `1 MiB = 1048576 bytes` 计算） |
| SHA-256 | `ce8d73698ade5e80e6fa85658cf6b8f36d11fc999b825473c82cf9f3cd7ffe8b` |
| Source commit | `890d5e0d0ef406e1cd5d99d40c63270d8a1d2455` |
| 签名状态 | 未签名（`signed: false`） |

磁盘上的 EXE 实际字节数和重新计算的 SHA-256 与 `dist/portable-build-manifest.json`、`dist/个人产品经理工作台.exe.sha256` 及 `test-results/personal-codex-workbench/portable-exe-results.json` 一致；构建清单中的 `sourceCommit` 与 `payload.sourceCommit` 也一致。

## 验证结果

### 全量自动化测试

- 结果：PASS。
- 汇总：`198 total`、`196 pass`、`2 skip`、`0 fail`。
- 两项跳过均为当前 Windows 账号没有符号链接权限而触发的 `EPERM`：`manifest generation rejects symbolic links` 和 `manifest rejects symbolic-link files`。这两项是环境权限跳过，不是测试失败。

### 真实便携 EXE 验收

`npm.cmd run workbench:verify-portable` 结果为 PASS，机器可读证据中的便携检查如下：

| 检查 | 结果 |
| --- | --- |
| 受限 PATH 启动 | PASS；测试 PATH 中没有 Node、npm 或全局 Codex |
| 资源解压（`assetExtraction`） | PASS |
| Manifest 校验（`manifestVerification`） | PASS |
| 真实 Codex 只读 Run（`realCodexReadOnly`） | PASS |
| 三个产品工作流（`threeWorkflows`） | PASS |
| 隔离写入与恢复（`isolatedWriteRestore`） | PASS |
| 重复启动复用已有实例（`duplicateLaunchReuse`） | PASS |
| 强制停止后的陈旧状态恢复（`forcedShutdownStaleRecovery`） | PASS |
| 损坏缓存重建（`corruptCacheRecovery`） | PASS |
| 正常关闭（`gracefulShutdown`） | 已由 launcher 单元测试覆盖 |

本次真实 EXE 验收没有复现此前的长路径解压失败。证据文件将干净 Windows 机器状态明确记录为 `not-tested`。

### UI 回归验证

`npm.cmd run workbench:verify-ui` 结果为 PASS。`test-results/personal-codex-workbench/test-results.json` 记录 `status: passed`，且对应同一 source commit；1440、1024、768 和 375 像素四档视口的控件与无横向溢出检查均通过，权限模式、安全 Run 详情、对话框和三工作流交互检查通过，`consoleErrors` 与 `pageErrors` 均为空，截图证据已生成。

## 限制与首次使用要求

- 尚无干净 Windows 10/11 机器的安装、启动和运行证据，因此不能宣称已完成跨机器认证。
- EXE 未签名，Windows 可能显示 Microsoft Defender SmartScreen 提示。
- 首次使用需要完成 Codex 登录，并需要联网以完成认证及执行 Codex 请求。
