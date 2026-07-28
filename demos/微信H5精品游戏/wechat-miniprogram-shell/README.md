# 微信小程序 `web-view` 试玩壳

这是三款 H5 游戏的最小小程序承载壳，包含游戏选择页、域名配置检查和 `web-view` 游戏页。

## 使用

1. 在微信开发者工具中导入本目录。
2. 把 `project.config.json` 的 `appid` 替换为公司目标小程序 AppID。
3. 把 `app.js` 的 `h5GameBaseUrl` 配置为部署三款 HTML 的 HTTPS 目录。
4. 在微信公众平台把该 HTTPS 域名加入业务域名。
5. 用 iOS/Android 微信真机分别验证进入、触控、声音解锁、后台恢复和返回。

工作区根目录可先运行静态结构验收：

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
```

示例：

```js
h5GameBaseUrl: "https://game.example.com/wechat-h5-premium-games"
```

最终地址会拼成：

```text
https://game.example.com/wechat-h5-premium-games/01-five-seconds-later.html
```

## 安全边界

- 壳层不把 `OpenID`、`session_key`、手机号或长期令牌放入 H5 URL。
- 当前没有登录、支付、广告、分享、排行榜、云存档或 `wx.miniProgram.postMessage`。
- `touristappid` 只用于导入结构检查，不能用于生产发布。
- 业务域名、主体类目、隐私协议、内容审核和真机性能仍需公司环境完成。
