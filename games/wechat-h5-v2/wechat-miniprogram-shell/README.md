# 微信 `web-view` 非生产承载壳

本目录仅用于开发者工具中的非生产链路检查。`touristappid` 不可用于发布，也不能证明微信生产环境、iOS 或 Android 真机可用。

使用前只在本地工作副本的 `app.js` 中配置已完成微信业务域名备案和 HTTPS 校验的 `h5BaseUrl`。仓库不得保存真实 AppID、OpenID、`session_key`、Cookie、Token、授权头或其他账号凭证。

基础 URL 为空、不是 HTTPS、包含凭证或仍是示例地址时，游戏页不会创建 `web-view`，只显示配置错误。
