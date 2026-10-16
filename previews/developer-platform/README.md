# 开发者与运营统一Demo

固定入口：https://z36358631-ship-it.github.io/-/previews/developer-platform/

入口默认打开开发者平台，顶部可切换运营管理后台。CDK兑换记录直达：https://z36358631-ship-it.github.io/-/previews/developer-platform/#ops/operations/P01-11

## 持续维护

正式维护源为`prd/发行平台专项/完整开发者与运营管理平台-合并版.html`。本目录的`index.html`是同一文件的发布副本，不独立编辑。后续沿此目录和地址更新，不新建带日期的主入口。

CDK兑换记录的维护源另见`demos/开发者后台一期/src/runtime/publisher-redemption-records.js`与对应CSS；源改动须同步到合并HTML中。不能用历史合并脚本整体重建当前文件，以免覆盖后续栏目更新。

发布前验证正式合并HTML，记录SHA256与当前截图。运行`scripts/publish-developer-platform.ps1 -Phase assets -EvidenceDirectory <本轮证据目录> -VerifiedSha256 <已验收的SHA256>`，复制正式HTML与本轮三张图，限定路径生成提交并追加到现有master Pages分支。此脚本使用独立索引，保留当前工作分支和暂存区；远端变化或非快进推送会停止，不强推。

PRD配图发布在`public/prd/developer-platform/`，图片使用本轮资产提交的固定SHA，Demo链接始终使用上述固定入口。文档同步后，以同一证据目录运行脚本的`-Phase documents`。最后分别核对公网HTML字节、实际切换与查询、图片状态及Pages构建。

本页为只读样例与交互原型，正式CDK、核销、权益及服务端权限尚未联调。
