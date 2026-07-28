# 微信 H5 精品游戏三款纵切片 QA 报告

## 1. 验收结论

浏览器非生产评审包验收：**READY**。

本结论覆盖本地 Edge/Playwright、三档移动视口、确定性胜负路径、生命周期、事件协议、离线资源、生产入口门禁、无障碍专项和人工截图审查；不代表 iOS/Android 微信 WebView 真机认证或微信平台审核通过。

执行命令：

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

最终结果：

```text
hub                   compact  PASS
hub                   baseline PASS
hub                   large    PASS
five-seconds-later    compact  PASS
five-seconds-later    baseline PASS
five-seconds-later    large    PASS
world-mender          compact  PASS
world-mender          baseline PASS
world-mender          large    PASS
rift-hunter           compact  PASS
rift-hunter           baseline PASS
rift-hunter           large    PASS
hub                   direct-file PASS
five-seconds-later    direct-file PASS
world-mender          direct-file PASS
rift-hunter           direct-file PASS
five-seconds-later    production-guard PASS
world-mender          production-guard PASS
rift-hunter           production-guard PASS
world-mender          landscape-guard PASS
world-mender          sound-bus PASS
```

详细机器结果：`test-results/wechat-h5-premium-games/verification.json`。

## 2. 共通检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| 360×800 | PASS | compact 结果无横向溢出 |
| 390×844 | PASS | baseline 结果与关键截图 |
| 430×932 | PASS | large 结果无横向溢出 |
| 触控目标 | PASS | 可见 DOM 控件不小于 44×44 |
| 真实触摸链 | PASS | CDP 发送 `touchStart → touchMove → touchEnd`；三款分别验证移动目标、苔原桥缝合和猎人位移，并捕获对应 `first_input` |
| 控制台与页面异常 | PASS | `errors` 为空 |
| 外部请求 | PASS | `externalRequests` 为空 |
| 离线单文件 | PASS | 无外部脚本、iframe、HTTP 图片/音视频资源；大厅和三款均通过 Edge `file://` 直开 |
| 测试接口 | PASS | 三款只在 `test=1` 时挂载 `window.__GAME_TEST__`；普通入口为 `undefined`，且 `seed/speed/mute` 不改变规则 |
| 状态播报 | PASS | 三款均有离散 `aria-live`/`role=status`；高频 HUD 不作为直播区 |
| 结算焦点 | PASS | 三款胜负结算均播报结果并把焦点移入带标题的对话层；重玩后焦点返回游戏容器 |
| 自然速度性能预警 | PASS | 本地 Edge、390×844、DPR2、每款约 8 秒；三款 rAF P95 为 18.1–18.2ms、最大 19.3ms、Long Task 为 0 |
| 自然速度长测 | PASS WITH WARNING | 每款约 2 分钟；三款 rAF P95 18.2ms、Long Task 0、DOM 增量 0；《裂隙猎人》CDP Nodes 波动预警保留，真实 DOM 111 与事件监听 28 保持不变 |
| 生命周期 | PASS | 测试注入 `document.hidden=true` 后三款均进入暂停，等待期间局内时间变化不超过 100ms；恢复可见后由玩家主动继续 |
| 公共事件 | PASS | 三款确定性路径均在运行时实际发出必需九类公共事件；事件信封逐条校验 `source/version/gameId/runId/event/ts/payload` |
| 大厅事件安全 | PASS | HTTP 只接收同源窗口消息，`file://` 只接收本地 `null` origin；事件名、`runId`、时间戳和 payload 类型受限，非同源或 HTML 注入事件不能写入记录或伪造进度 |
| 重新开始 | PASS | 结算后重玩按钮可见；点击后无需刷新页面，`runId` 更新，`replay_start` 绑定新 `runId` |

公共事件静态门禁：

- `game_start`
- `first_input`
- `mechanic_reveal`
- `phase_change`
- `core_payoff`
- `run_end`
- `replay_start`
- `lifecycle_pause`
- `lifecycle_resume`

运行时证据位于 `verification.json` 各游戏 `baseline.scenario.lifecycle`、`baseline.scenario.touch` 与 `baseline.scenario.replay`。事件数量受确定性路径中的动作次数影响，不固定为验收门槛；本轮只用来证明事件确实发出、信封合法且关键顺序可被机器检查。

性能预警命令：

```powershell
node tools/profile-wechat-h5-premium-games.mjs
```

结果位于 `test-results/wechat-h5-premium-games/performance.json`。该短测只用于浏览器回归预警，不代表微信真机帧率、内存、功耗或热稳定性。

长测命令：

```powershell
node tools/profile-wechat-h5-longrun.mjs
```

结果位于 `test-results/wechat-h5-premium-games/longrun-performance.json`。`PASS_WITH_WARNINGS` 不等于内存泄漏结论：本轮《裂隙猎人》的 CDP Nodes 在采样间多次回落，真实 DOM、事件监听、Long Task 和 JS 堆均未达到硬失败阈值。该预警必须带到微信真机长时验收，不得删除或改写成无风险。

## 3. 《五秒之后》

### 胜利路径

固定种子 `20260728`：

1. 第一条五秒轨迹停留 A 机关。
2. 当前角色移动到 B 机关，完成双角色协作。
3. 在局内 101/106/111/116 秒分别把四段路线写入Ⅰ/Ⅱ/Ⅲ/Ⅳ时间门。
4. 123 秒四门全部标记并破盾。
5. 当前角色靠近核心完成终击。

结果断言：

- `mode === "won"`
- `echoCount === 4`
- `shieldsRemaining === 0`
- `coreHp === 0`

### 失败路径

重置后不进行有效目标操作，180 秒到时进入失败结算：

- `mode === "lost"`
- `targetsDestroyed === 0`

### 第二轮视觉修复

- 阶段 HUD 从泛化阶段名改为唯一实时目标。
- 当前目标明确区分清锚点、A/B 协作、编号回声穿门和核心终击。
- 360px 下目标字号大于 12px。
- 结算新增四种回声轨迹汇合时间核心的专属图形。

### 第三轮理解与辨识修复

- 锚点文案明确为“可降低压力”的辅助目标，不再暗示必须清空才能胜利。
- HUD 持续显示“正在录制的回声编号”，同步描边高亮对应编号；Ⅰ–Ⅳ字号提升到 11px。
- 当前角色误入编号门时，明确提示“现在的你不能开门”以及当前路线将在几秒后成为哪一号回声。
- 静音态由容易被误解为关闭页面的“×”改为“静”。

### 第四轮首局闭环修复

- 静止五秒不再生成“有效回声”，并提示必须移动形成路线；编号仍按Ⅰ→Ⅱ→Ⅲ→Ⅳ固定时间槽循环，不因跳过静止片段而漂移。
- 同一编号槽反复重录时只保留最新轨迹，`mechanic_reveal` 在单局内只触发一次。
- 编号门阶段把“正在录制编号—同编号门—五秒后由回声生效”合并为单一目标；对应门增加白色虚线外环和“录制→”标记。
- 失败结算根据协同机关、未标记编号门、剩余护盾或未完成终击给出下一局动作。
- 新增离散局内状态播报区；静止失败路径断言 `echoCount === 0`。

截图：

- `five-seconds-later-opening.png`
- `five-seconds-later-mechanic.png`
- `five-seconds-later-gate-guide.png`
- `five-seconds-later-first-input.png`
- `five-seconds-later-result.png`

## 4. 《世界缝补师》

### 胜利路径

标准路线连接：

- `w1 → w2`：西侧桥梁
- `n1 → n2`：北侧风沙屏障
- `e1 → e2`：东侧桥梁
- `g1 → g2`：中心花园

结果断言：

- `phase === "won"`
- `saved === 9`
- `lost === 3`
- `thread === 29`
- 桥梁、屏障和花园均已建立

### 失败路径

不连接任何锚点并推进完整局：

- `phase === "lost"`
- `saved === 0`

### 第二轮视觉修复

- 游戏壳禁止文字拖选，消除蓝色选择高亮。
- 战斗常驻设置仅保留暂停。
- 声音与减少动态效果移入暂停层。
- 路线图例首次操作后折叠为可重新展开的提示胶囊。

### 第三轮理解与资源修复

- 开场和 HUD 明示胜利条件为“救 9/12＋连接花园”。
- HUD 明示花园回路需 76cm，金线只够花园加三条救援路线。
- 穷举四种“三条救援＋花园”组合均不超过 345cm；四条外围路线可误选，但再加花园必定超出预算。
- 未连接路线成本提升为 12px，并使用深色标签承载。
- 结算增加桥梁、屏障和花园回路摘要，支持下一局复盘。

### 第四轮首局节奏修复

- 第一针定向高亮西侧苔原桥，两个锚点使用脉冲外环，路线标签显示“第一针 72”。
- 完成第一针后引导自动消失。
- 支持“拖动连接”和“轻点起点、再轻点终点”两种真实触摸方式；轻点完成后自动清除选中态。
- 任意四条路线锁定后，生命归园或失败等待速度提升至 `×1.8`，HUD 和状态播报同步说明，减少无操作等待。

截图：

- `world-mender-opening.png`
- `world-mender-mechanic.png`
- `world-mender-first-input.png`
- `world-mender-result.png`

## 5. 《裂隙猎人》

### 胜利路径

1. 测试接口给予经验，确认武器达到第三形态。
2. 验证 59 秒无信标，时间推进至 60 秒后确认首个撤离区开放。
3. 角色进入撤离区并连续驻留三秒。

结果断言：

- `mode === "extracted"`
- `weaponStage === 3`
- 带出物列表非空
- 遗失价值为 0

### 失败路径

重置后放入两件不同价值战利品并触发死亡：

- `mode === "dead"`
- 只保留最高价值的一件
- 其余物品进入遗失列表

### 第二轮视觉修复

- 清除 9–10px 微型文字。
- 玩法说明不低于 12px，辅助与结果标签不低于 11px。
- 360px 开场缩短英雄留白，为规则卡与主按钮让出空间。
- HUD 重排为生命、危险、撤离条件第一层，其他数据第二层。

### 第三轮风险决策修复

- 自动验收先截真实开场，再显式点击“进入裂隙”，不再把战斗 9 秒画面误作 opening。
- 开场明示“时间越久，危险与掉落价值越高；撤离全带出，死亡只保最高价值一件”。
- 首次拾取和首次撤离前增加一次损失规则提醒。
- 150 秒最终信标开启时关闭旧临时撤离区，HUD 与可用撤离规则保持一致。
- 敌弹改为红粉实心核和亮色描边，视觉直径至少 10px，与玩家和紫色敌人区分。

### 第四轮决策节奏与无障碍修复

- 首次撤离窗口由 90 秒前移至 60 秒，接在 45 秒精英战之后；45 秒再次提醒撤离与死亡损失。
- 150 秒仍只保留最终三角信标；对象池活动数量逐类断言不超过预分配上限。
- 本地设置或最佳价值被写入错误类型时会恢复布尔默认值和有限数值，不要求玩家手动清缓存。
- 撤离同步文案由“不要离开绿区”改为“留在三角信标区”，不只依赖颜色。
- 高频生命、计时和击杀 HUD 移出 `aria-live`，只播报升级、风险规则和撤离阶段等离散事件。
- 撤离或死亡结算会更新状态播报，并把焦点移入带标题的结算对话层。

### 第五轮无障碍、音频与发布门禁加固

- 三款开场、暂停和结算统一使用对话层、背景 `inert`、Tab 循环降级和焦点恢复。
- 《五秒之后》《世界缝补师》在高度不超过 600px 的短横屏显示竖屏阻断，不推进局时；恢复竖屏后仍需玩家主动继续。
- 大厅和《五秒之后》正确响应系统减少动态效果。
- 《世界缝补师》增加有效缝合、无效缝合、生命获救和胜负结算四类程序合成短音效；单 AudioContext、首次手势解锁，静音、暂停和页面隐藏时安全降级。
- `seed/speed/mute` 与 `window.__GAME_TEST__` 全部限定在 `test=1`；普通入口固定自然速度。
- 无障碍自动验收达到 `25/28 PASS`，唯一允许失败为三款 `zoom-200`。这三项是 P2 已知限制，不得改写为 PASS。

截图：

- `rift-hunter-opening.png`
- `rift-hunter-mechanic.png`
- `rift-hunter-first-input.png`
- `rift-hunter-result.png`

## 6. 微信小程序承载壳

`demos/微信H5精品游戏/wechat-miniprogram-shell/` 已提供：

- 三款游戏选择页。
- 强制 HTTPS 且未配置域名时不加载的 `web-view` 承载页。
- `touristappid` 导入配置、页面路由、全局样式和业务域名配置说明。
- 不在 H5 URL 传递 `OpenID`、`session_key` 或长期令牌。

静态验收：

```powershell
node tools/verify-wechat-miniprogram-shell.mjs
```

结果：47/47 PASS，并生成 `test-results/wechat-h5-premium-games/miniprogram-shell-verification.json`。必需文件存在，五个 JSON 可解析，三个 JavaScript 文件语法通过，三款 HTML 路由、`web-view` 模板和合法 HTTPS 目录拼接均通过；HTTP、缺失主机、query、hash、URL 凭证和未知游戏参数均进入错误态，深链无上一页时回到游戏列表。当前电脑未安装微信开发者工具，因此本结论不包含微信编译、预览、真机或审核证据。

## 7. 已关闭问题

| 问题 | 修复 |
|---|---|
| favicon 自动请求导致一次 404 | 三款均使用 `data:` favicon |
| 《五秒之后》减少动态开关只有 28px 高 | 提升到至少 44px |
| 生命周期事件名称不统一 | 统一为 `game_start/lifecycle_pause/lifecycle_resume` |
| 《世界缝补师》自动截图停在失败蒙层 | 验证脚本改用固定锚点胜利路线 |
| 《裂隙猎人》截图只覆盖死亡 | 增加第三段武器与成功撤离路径 |
| 自动化在结果层误触重玩 | 驱动画布前读取游戏状态，结算后停止输入 |
| 《五秒之后》只有失败结算 | 增加稳定的四编号时间门胜利序列 |
| 生命周期暂停偶发超过 100ms | 在确认进入暂停后读取计时基准，再等待比较，消除 CDP 往返竞态 |
| 大厅打开游戏后仍显示 0/3 | 新窗口保留同源 `opener`；自动验收用三款真实 `GamePlatform.emit` 验证大厅完成 3/3 |
| README 暗示小程序 `bindmessage` 已可收事件 | 移除未实现示例，明确当前无微信 JS-SDK/微信桥；生产需 HTTPS 上报或另接 `wx.miniProgram.postMessage` |
| 《裂隙猎人》opening 截到战斗中 | 测试模式不再自动开局，由验证脚本截开场后显式启动 |

## 8. 尚未验证

- iOS 微信 WebView 的触控延迟、Web Audio 解锁、页面恢复。
- Android 高、中、低档设备的帧率、内存与后台回收。
- 微信开发者工具与公司主体的业务域名、类目和审核。
- 弱网、远程资源缓存、CDN 回滚和真实线上上报。
- 登录、云存档、分享、广告、支付、排行榜和反作弊。
- 五名以上非制作人员的无引导首局测试。
- 三款全屏 Canvas 的 200% CSS zoom 重构与真机验证。

以上项目进入小流量测试前必须补齐，不能由当前浏览器结果推定。本包是非生产评审包；微信开发者工具、正式 AppID、业务域名、iOS/Android 真机、CDN、灰度、监控、回滚和审核未完成，不能声明生产 GO。
