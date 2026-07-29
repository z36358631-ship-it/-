# 微信 H5 高保真游戏 V2 非生产评审指南

本目录描述《弹珠暴走团》《怪兽夜市》《三路小队》及统一大厅的本地评审流程。当前交付是非生产候选：浏览器自动化已执行，但完整 AI 六角色盲评、真实用户、微信开发者工具、iOS/Android 真机、正式 HTTPS 业务域名和平台审核均未完成。

## 环境

- Windows 10/11 与 PowerShell。
- Node.js `>=20.11`；当前依赖锁以 `games/wechat-h5-v2/package-lock.json` 为准。
- npm 随 Node 安装；PowerShell 中使用 `npm.cmd` 和 `npx.cmd`。
- Edge 或 Chrome，用于本地浏览器评审。
- Playwright Chromium；首次执行可运行 `npx.cmd playwright install chromium`。
- 微信开发者工具仅用于后续真实承载验证，当前状态为 `NOT EXECUTED`。

## 接收与开始顺序

严格按以下顺序执行，不跳过完整性检查：

```text
核对ZIP及包外SHA-256
→ 解压并运行包内完整性验证
→ 保留只读母包并复制工作副本
→ 打开统一大厅试玩
→ 安装Node依赖并重跑自动验收
→ 阅读AI资深玩家评分与保留决定
→ 部署HTTPS资源
→ 配置微信业务域名和正式AppID
→ 开发者工具、iOS/Android真机、弱网与后台恢复
→ 真实用户测试
→ 灰度、监控、回滚和审核
```

当前仓库没有生成正式 ZIP、包外 SHA-256 或只读母包，因此前三项为 `NOT EXECUTED`。不得把源码目录当作已校验发布包。

## 本地安装与自动验收

从工作区根目录执行：

```powershell
Set-Location 'games/wechat-h5-v2'
node --version
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npx.cmd playwright test tests/e2e/hub-and-apps.spec.ts --project=chromium
npx.cmd playwright test tests/performance/frame-budget.spec.ts --project=chromium
node tools/verify-miniprogram-shell.mjs
Set-Location ../..
node games/wechat-h5-v2/tools/verify-team-collaboration.mjs docs/wechat-h5-v2/team-collaboration-log.md
```

预期：

- TypeScript、Vitest、四应用构建、bundle 边界、Chromium 启动和帧预算均通过。
- 小程序壳输出 `production NOT EXECUTED`。
- 在证据主动区间并集不足 480 分钟时，协作门禁必须失败；当前日志预期错误码为 `COLLAB_ACTIVE_UNION:<verified><480`。

## 打开统一大厅

先构建，再启动只读静态服务器：

```powershell
Set-Location 'games/wechat-h5-v2'
npm.cmd run build
node tools/assets/serve-dist.mjs
```

用 Edge/Chrome 打开 `http://127.0.0.1:4173/hub/`。三款游戏可分别直达：

- `http://127.0.0.1:4173/ricochet-crew/`
- `http://127.0.0.1:4173/monster-night-market/`
- `http://127.0.0.1:4173/three-lane-squad/`

本地 HTTP 只用于本机评审，不可配置为微信业务域名。

## AI 评审状态

方法见 [AI 资深玩家评审方法](./ai-playtest-method.md)。当前只有预检素材和验证工具，不存在完整的 18 份基线报告与 54 个唯一局次，因此：

- AI-playtest：`NOT EXECUTED`
- RETAIN / REWORK / DROP：`INCOMPLETE`
- 真实用户测试：`NOT EXECUTED`

不得根据自动化通过、美术质量或少量预检截图推导“用户会持续游玩”。

## 微信 `web-view` 壳

非生产壳位于 `games/wechat-h5-v2/wechat-miniprogram-shell/`：

1. 当前 `project.config.json` 使用 `touristappid`，不可发布。
2. `app.js` 的 `h5BaseUrl` 默认留空；空值时不会创建 `web-view`。
3. 后续只允许在私有工作副本中配置已经审核的 HTTPS 业务域名。
4. 仓库不得写入真实 AppID、OpenID、`session_key`、Cookie、Token、Authorization、手机号或支付信息。
5. 正式 AppID、业务域名、微信开发者工具、iOS/Android 真机和生产环境均为 `NOT EXECUTED`。

## 生产边界

只有 [发布清单](./release-checklist.md) 中每一项都有独立证据时才可讨论生产 Go。当前明确不是以下任何一种状态：

- 不是微信生产包；
- 不是已备案和审核的 HTTPS/CDN 部署；
- 不是完成真实用户验证的产品；
- 不是完成监控、灰度和回滚演练的版本；
- 不是通过平台审核的版本。
