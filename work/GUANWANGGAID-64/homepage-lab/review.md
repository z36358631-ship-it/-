# r8 系统地区与立体设备外壳评审

审核者：主管 root；独立需求验收官 /root/r6_review。

主管实际审阅 r8-shell-android-domestic-portrait.png、r8-shell-ios-overseas-portrait.png、r8-shell-ios-overseas-landscape.png、r8-shell-android-overseas-tablet.png；其他形态保留截图。来源见 sources.json，外壳为 DOM/CSS，App 素材内嵌。

用户视角：左控制、右机身与参考一致；系统、地区独立切换，iOS隐藏兼容查询金刚/顶部入口及最新兼容，海外隐藏云游戏和云游组队入口；横屏金刚左图标右名称，顶行4:1保持。

开发视角：海外游戏库、准备说明、详情云路径和云时长入口均隐藏；弱设备不承诺可玩。独立评审发现的准备页云入口漏网已修复并复验 cloudButtons=0。系统或地区切换回首页清栈，返回不复活被禁用页面。58组本地浏览器检查通过，含四组合×三形态、原交互回归和窄视窗。

商业视角：没有新增服务、真实支付、通知或兼容数据库。iOS兼容频道/合集是否额外隐藏已问未答，当前保留，不扩展删除范围。秒玩海外保留。

运行异常0、外部运行时请求0。独立三视角复核和主管审图无剩余阻断项；此结论仅针对评审Demo，不代表真实用户效果、实机兼容或逐像素复刻。

最终HTML SHA256：c546556412b69c58343ca778e4ddf7142b5ecfb39af09b242aafc24fc8c9e909
