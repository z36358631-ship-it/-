# 兼容性评价 Mac 页面与三端整合

目标：沿用租号 Demo 的 Mac 详情骨架与历史图片，加入兼容性入口及评价流程；一个离线 HTML 通过 Android、Mac、后台三个 Tab 演示。

本轮已授权范围：Mac 详情、评价列表、填写及编辑、已有快照详情；原地址更新。Mac 退出邀评仍未确认，不在本轮扩展。

## 文件与执行

- [x] 读取 Mac端demo/mac端租号功能/游戏详情改动.html 与 Mac端租号功能-标注版.html，记录真实图和详情骨架。
- [x] 新增 demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html；独立桌面 DOM、离线图片、四类评价及快照交互。
- [x] tools/build-compatibility-suite.mjs 打包三份 HTML 到整合 Demo 及 previews/compatibility-review-v1.2/index.html；切换时清理监听器与定时器、隔离脚本作用域，不用 iframe。
- [x] 浏览器检查各端入口、切换往返、Mac 新增编辑删除、筛选、图片、配置动作和无网打开，捕获脚本错误及实际截图。
- [x] 更新 PRD 中 Mac 页面、配图、群同步 MD 与状态卡，注明本轮修改日期。
- [x] 仅提交本任务文件至隔离工作区，main 保存源文件和图片，master 更新原公开地址。验证线上三 Tab 和图片可访问。

## 验收约束

保留 Android 已确认规则、单一全局邀评频控及后台功能。Mac 不套用手机壳；不复制整页截图当背景；游戏图片来自已有素材。三端切换不得残留弹层、重复监听器、丢失已提交评价。保存只写本地 Demo，不声称联调真实服务。
