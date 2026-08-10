# Mac 原生游戏版本管理 PRD 发布验证报告

## 结论

PRD V1.5 已完成本地内容、Demo 和远程图片验证；Git提交、飞书更新和任务板送审待发布授权后执行。

## PRD 检查

- 文档共231行，包含标准九章主体和附录。
- 仅输出“4.2 详细设计（C端）”，C端功能使用一个三列汇总表。
- 汇总表包含7个功能模块，每个模块均按“规则”和“交互”分组编号。
- 共14处图片引用，对应7张唯一功能图。
- 7张图片均使用固定提交 `db2fabd109b9a21a69f5993ec9b621d5d01bf6f0`。
- 7/7图片返回 HTTP 200，`Content-Type` 均为 `image/png`。
- `file://`、`localhost`、`@main`、`@master` 和 GitHub blob 图片地址均为0处。
- 埋点事件引用的参数与参数说明表完全对应，无缺漏和多余参数。

## Demo 检查

- 静态与真实浏览器测试共14项，14/14通过。
- 已覆盖游戏库与搜索平台标识、版本弹窗、唯一下载入口、设置页兼容入口、完整路径平铺、最大空间默认、异常路径、下载锁定、取消复位和安装成功。
- 真实浏览器测试无页面脚本错误。

## 自动化命令

```text
node --test tests/mac-native-prd-v15.test.mjs
结果：5/5 通过

node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs
结果：14/14 通过

git diff --check
结果：通过
```

## 发布状态

- 当前分支：`codex/guanwanggaid-5-prd-feishu-20260810`
- 当前远端提交：`db2fabd109b9a21a69f5993ec9b621d5d01bf6f0`
- 待发布文件：PRD V1.5、V1.5结构测试、实施计划和本验证报告。
- 当前飞书文档仍为V1.4：https://gamesirworld.feishu.cn/wiki/O2tyw3e0tiWLYokQzQLcUUeRn2c
