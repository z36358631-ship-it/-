# 兼容性评价改版 Demo

- [C 端一键打开](https://z36358631-ship-it.github.io/-/previews/compatibility-review-v1.2/index.html)
- [B 端后台预览](https://z36358631-ship-it.github.io/-/previews/compatibility-review-v1.2/admin.html)

源文件分别位于 demos/游戏详情/ 和 demos/后台管理/。本目录 index.html 与 admin.html 是对应源文件的完整副本，没有外部加载依赖，也可下载后双击离线演示。

后续更新：从当前源文件同步覆盖本目录两个 HTML，在 main 保存源文件与文档；再把本目录的同一版本提交到 master。当前仓库 Pages 实际发布源为 master 根目录，勿更改整个仓库的 Pages 设置。两个公开路径保持不变。

Pages 仍依赖会议室网络，未验证所有国内网络可达性。会议演示可优先用离线文件；jsDelivr 返回 HTML 时为 text/plain，仅用于 PRD 图片。raw.githack 在浏览器中有额外确认页，不作为一键入口。
