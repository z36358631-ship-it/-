# 微信 H5 精品游戏试玩包

## 内容

- `index.html`：三款游戏统一试玩大厅。
- `01-five-seconds-later.html`：《五秒之后》。
- `02-world-mender.html`：《世界缝补师》。
- `03-rift-hunter.html`：《裂隙猎人》。

三款游戏均为离线可运行的单文件 HTML，不依赖 CDN、外部图片、在线字体、登录、广告或支付。

## 本地打开

单独试玩时可以直接双击任一游戏 HTML。

如需让大厅接收各游戏的体验事件，建议在工作区根目录启动本地服务：

```powershell
python -m http.server 8080
```

然后访问：

```text
http://127.0.0.1:8080/demos/微信H5精品游戏/
```

自动化验收：

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

当前脚本覆盖三档移动视口的大厅与三款游戏、真实触摸拖动、确定性胜负路径、后台暂停与主动恢复、事件信封、结算重玩、对象池边界，以及大厅和三款页面的 `file://` 直开。机器结果和关键截图写入 `test-results/wechat-h5-premium-games/`。

`wechat-miniprogram-shell/` 提供可导入微信开发者工具的最小 `web-view` 承载壳。静态结构验收：

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
```

自然速度浏览器性能预警：

```powershell
node tools/profile-wechat-h5-premium-games.mjs
```

该脚本在本地移动视口中各运行约 8 秒并输出 rAF 帧间隔、Long Task 和 JS 堆摘要，只用于回归预警，不替代微信真机性能测试。

## 微信小程序 WebView 接入

当前交付适合用普通微信小程序的 `web-view` 作为玩法验证入口。部署前需要：

1. 把该目录部署到公司拥有、已备案且支持 HTTPS 的域名。
2. 在微信公众平台为目标小程序配置该域名为业务域名。
3. 使用企业或其他支持 `web-view` 的小程序主体；个人类型小程序不支持。
4. 在小程序页面中把远程 H5 地址绑定给 `web-view`。

页面示例：

```xml
<web-view src="{{gameUrl}}"></web-view>
```

```js
Page({
  data: {
    gameUrl: ""
  },
  onLoad(options) {
    const routes = {
      five: "/01-five-seconds-later.html",
      mender: "/02-world-mender.html",
      hunter: "/03-rift-hunter.html"
    };
    const route = routes[options.game] || routes.five;
    const baseUrl = getApp().globalData.h5GameBaseUrl;
    this.setData({ gameUrl: `${baseUrl}${route}` });
  }
});
```

小程序全局配置 `h5GameBaseUrl` 时使用公司实际 HTTPS 业务域名。H5 不在 URL 中传递 `OpenID`、`session_key` 或长期登录令牌。

当前单文件 H5 **没有引入微信 JS-SDK，也没有调用 `wx.miniProgram.postMessage`**。因此，小程序页面不能通过 `bindmessage` 收到下文事件信封。现有 `GamePlatform.emit` 只用于同源本地大厅：游戏由新窗口打开时，通过 `window.opener.postMessage` 返回关键体验事件。

生产环境如需采集事件，有两种方案：

1. 推荐由 H5 通过公司 HTTPS 数据接口批量上报，补充匿名设备、会话、版本、去重和重试字段。
2. 如必须传给小程序页面，先按微信官方要求引入并初始化 JS-SDK，再调用 `wx.miniProgram.postMessage`；该通道只会在后退、组件销毁、分享等特定时机投递，不得作为局内实时 RPC。

这两种生产能力均不包含在当前离线纵切片中。

## 事件协议

游戏发送的事件信封：

```js
{
  source: "wechat-h5-premium-games",
  version: 1,
  gameId: "five-seconds-later",
  runId: "本局唯一标识",
  event: "mechanic_reveal",
  ts: 1785250000000,
  payload: {}
}
```

事件包括：

- `game_start`
- `first_input`
- `mechanic_reveal`
- `phase_change`
- `core_payoff`
- `run_end`
- `replay_start`
- `lifecycle_pause`
- `lifecycle_resume`

微信 `web-view postMessage` 只会在后退、组件销毁、分享等特定时机投递，不能用于局内实时 RPC。本试玩包的核心游戏状态不依赖该通道，当前版本也未实现该微信桥。

## 测试参数

自动化脚本使用以下查询参数：

```text
?test=1&seed=20260728&speed=20&mute=1
```

- `test=1`：开启自动验收支持。
- `seed`：固定关卡随机种子。
- `speed`：只加速局内时钟，不改变碰撞和胜负规则。
- `mute=1`：静音运行。

每款游戏提供：

```js
window.__GAME_TEST__.getState();
window.__GAME_TEST__.reset();
```

测试接口用于自动验收，不承载正式业务能力。

## 后续迁移微信小游戏

微信小游戏不是浏览器，不能把当前 HTML 原样发布。后续迁移时可复用：

- 核心规则与数值。
- 固定时间步和确定性随机逻辑。
- Canvas 绘制方法与资源预算。
- 事件字段和埋点口径。
- 游戏阶段、胜负与结算规则。

需要重新实现：

- 微信小游戏运行时适配。
- 登录、广告、分享、支付、排行榜和云存档。
- DOM 开始页、结算页与设置控件。
- 包体分包、审核、实名防沉迷和隐私授权。

## 当前交付边界

这是用于验证核心乐趣与视觉钩子的 H5 纵切片，不是已经具备商业上线条件的微信游戏。浏览器自动化通过后，仍需在 iOS 微信 WebView、Android 高中低档机以及公司主体的小程序审核环境中验证。
