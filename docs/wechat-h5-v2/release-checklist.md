# 微信 H5 V2 发布门禁清单

判定日期：2026-07-29。当前结论：`NO-GO / NON-PRODUCTION`。

`PASS` 只表示该项具有当前源码状态下的专项证据，不代表其他门禁自动通过。未执行或没有证据的项必须保持 `NOT EXECUTED`。

| 门禁 | 状态 | 当前证据 / 缺口 |
| --- | --- | --- |
| browser-review | PASS（非生产 Chromium） | `games/wechat-h5-v2/tests/e2e/hub-and-apps.spec.ts`；本线程执行 4/4，通过大厅图片解码和三款直达启动。未覆盖生产域名。 |
| AI-playtest | NOT EXECUTED | Task 12 真实 browser-touch 三局 pilot 尚未执行；在 pilot 通过前保持 `NOT EXECUTED`。仍缺少 18 份有效基线报告和 54 个唯一局次。每份正式报告必须引用 13 个 canonical evidence，单元目录恰好 14 个文件（额外文件为 `report.json`）。 |
| real-user | NOT EXECUTED | 未招募真实目标用户，未获得三局完成率、主动重玩或留存数据。 |
| WeChat-developer-tools | NOT EXECUTED | 仅建立 `touristappid` 非生产壳；未在微信开发者工具执行。 |
| iOS | NOT EXECUTED | 未执行微信 iOS 真机、弱网、后台恢复、内存和音频测试。 |
| Android | NOT EXECUTED | 未执行微信 Android 真机、弱网、后台恢复、内存和音频测试。 |
| HTTPS-domain | NOT EXECUTED | `h5BaseUrl` 保持空值；未配置、备案或审核正式业务域名。 |
| CDN | NOT EXECUTED | 未部署正式 CDN，未验证缓存、跨域、回源、刷新和版本回退。 |
| monitoring | NOT EXECUTED | 未建立生产告警、错误率、资源失败、帧率、漏斗和隐私审计。 |
| gray-release | NOT EXECUTED | 未定义或执行灰度人群、阈值、停止条件和扩量节奏。 |
| rollback | NOT EXECUTED | 未在生产等价环境演练版本回滚、资源回退和存档兼容。 |
| platform-review | NOT EXECUTED | 未提交微信平台审核，也没有审核结果。 |

## 额外阻断项

- 团队协作主动区间并集：`FAIL`，当前可核验证据少于 480 分钟；精确值以验证器即时输出为准。
- 正式 ZIP、包外 SHA-256、只读母包：`NOT EXECUTED`。
- Task 12 真实三局 AI pilot：`NOT EXECUTED`；不得用工具测试、预检截图或草稿替代。
- 完整 AI 保留决定：`INCOMPLETE`。
- 真实用户持续游玩验证：`NOT EXECUTED`。
- 证据信任边界：即使 `packageAuthenticated=true`，也只证明包字节匹配固定 Git commit；当前执行声明仍是 `executionTrust="local-audited"`、`independentlyAttested=false`，不是第三方独立认证。

## Go 条件

只有以下条件全部满足才可将 `NO-GO` 改为 `GO`：

1. 绑定同一不可变源码提交的全部自动化通过。
2. 六角色 AI 基线矩阵完整，所有拟发布游戏为 `RETAIN`。
3. 真实用户研究达到预先定义的完成率、重玩率和质量阈值。
4. 正式 HTTPS/CDN 与微信业务域名审核完成。
5. 微信开发者工具、iOS、Android、弱网和后台恢复均有证据。
6. 监控、灰度、回滚和平台审核完成。
7. 协作日志的可核验主动时间区间并集达到 480 分钟，且至少六类职能、无所有权冲突。
