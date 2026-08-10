# Mac 原生游戏版本管理 PRD 发布验证报告

## 结论

PRD V1.6 已完成内容、Demo、浏览器交互、Git 推送和远程图片校验。

## PRD 检查

- 文档包含标准九章主体和附录。
- 仅输出“4.2 详细设计（C端）”，C端功能使用一个三列汇总表。
- 汇总表包含7个功能模块，每个模块均按“规则”和“交互”分组编号。
- 共14处图片引用，对应7张唯一功能图。
- 7张图片均使用固定提交 `a50f0a54bd16fc0b728e83843bcf7a0c5f02e36d`。
- 7/7 图片返回 HTTP 200，`Content-Type` 均为 `image/png`。
- `file://`、`localhost`、`@main`、`@master` 和 GitHub blob 图片地址均为0处。
- 埋点事件引用的参数与参数说明表完全对应，无缺漏和多余参数。

## Demo 检查

- Node 静态与 PRD 契约测试共9项，9/9通过。
- 已覆盖苹果图标、上一次成功安装路径恢复、无合格路径、安装弹窗无进度条、提交后立即关闭、详情后台下载和安装成功。
- 真实浏览器验证中，离开详情后进度由0%继续到30%，完成后显示“开始游戏”；页面和控制台错误均为0。

## 自动化命令

```text
node --test tests/*.test.mjs
结果：9/9 通过

node tools/capture-mac-native-v16.mjs
结果：3张截图生成成功，浏览器交互断言全部通过

git diff --check
结果：通过
```

## 发布状态

- 当前分支：`codex/guanwanggaid-5-prd-feishu-20260810`
- 图片固定提交：`a50f0a54bd16fc0b728e83843bcf7a0c5f02e36d`
- PRD 与 Demo 提交：`2545bb29ac0e39caccbcc8eaf77c8411d084bfeb`
- 分支已推送，任务板进入评审状态。
- 飞书文档入口：https://gamesirworld.feishu.cn/wiki/O2tyw3e0tiWLYokQzQLcUUeRn2c
