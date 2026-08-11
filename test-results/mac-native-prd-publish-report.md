# Mac 原生游戏版本管理 PRD 发布验证报告

## 结论

PRD V1.7 已完成内容、Demo、浏览器交互、Git 推送和远程图片校验。

## PRD 检查

- 文档包含标准九章主体和附录。
- 仅输出“4.2 详细设计（C端）”，C端功能使用一个三列汇总表。
- 汇总表包含7个功能模块，每个模块均按“规则”和“交互”分组编号。
- 共16处图片引用，对应8张唯一功能图。
- 8张图片均使用固定提交 `06184f828c1d80e158a14bf0dc025fee9e6aa98e`。
- 8/8 图片返回 HTTP 200，`Content-Type` 均为 `image/png`。
- `file://`、`localhost`、`@main`、`@master` 和 GitHub blob 图片地址均为0处。
- 埋点事件引用的参数与参数说明表完全对应，无缺漏和多余参数。

## Demo 检查

- Node 静态与 PRD 契约测试共13项，13/13通过。
- 已覆盖 Steam 与 Apple 独立图标、上一次成功安装路径恢复、收起态第二行提示、候选路径展开、自定义目录、安装弹窗无进度条和详情后台下载。
- 真实浏览器验证确认“安装到其他位置”在收起态可见并另起一行；展开菜单含4个候选路径和自定义位置入口；页面和控制台错误均为0。

## 自动化命令

```text
node --test tests/*.test.mjs
结果：9/9 通过

node tools/capture-mac-native-v17.mjs
结果：3张截图生成成功，浏览器交互断言全部通过

git diff --check
结果：通过
```

## 发布状态

- 当前分支：`codex/guanwanggaid-5-prd-feishu-20260810`
- 图片固定提交：`06184f828c1d80e158a14bf0dc025fee9e6aa98e`
- Demo、截图与 V1.7 内容提交：`06184f828c1d80e158a14bf0dc025fee9e6aa98e`
- 分支已推送；飞书原页面待本次 V1.7 同步完成后复核。
- 飞书文档入口：https://gamesirworld.feishu.cn/wiki/O2tyw3e0tiWLYokQzQLcUUeRn2c
