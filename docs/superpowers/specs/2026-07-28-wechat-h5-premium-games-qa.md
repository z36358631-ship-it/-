# 微信 H5 精品游戏三款纵切片 QA 报告

## 1. 验收结论

浏览器纵切片验收：**PASS**。

本结论覆盖本地 Edge/Playwright、三档移动视口、确定性胜负路径、生命周期、事件协议、离线资源和人工截图审查；不代表 iOS/Android 微信 WebView 真机认证或微信平台审核通过。

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
```

详细机器结果：`test-results/wechat-h5-premium-games/verification.json`。

## 2. 共通检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| 360×800 | PASS | compact 结果无横向溢出 |
| 390×844 | PASS | baseline 结果与关键截图 |
| 430×932 | PASS | large 结果无横向溢出 |
| 触控目标 | PASS | 可见 DOM 控件不小于 44×44 |
| 控制台与页面异常 | PASS | `errors` 为空 |
| 外部请求 | PASS | `externalRequests` 为空 |
| 离线单文件 | PASS | 无外部脚本、iframe、HTTP 图片/音视频资源 |
| 测试接口 | PASS | 三款均有 `window.__GAME_TEST__` |
| 生命周期 | PASS | 隐藏/暂停时局内计时冻结 |
| 公共事件 | PASS | 必需九类公共事件均存在 |
| 重新开始 | PASS | 无需刷新页面，`runId` 更新 |

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

截图：

- `five-seconds-later-opening.png`
- `five-seconds-later-mechanic.png`
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

截图：

- `world-mender-opening.png`
- `world-mender-mechanic.png`
- `world-mender-result.png`

## 5. 《裂隙猎人》

### 胜利路径

1. 测试接口给予经验，确认武器达到第三形态。
2. 时间推进至 90 秒，确认首个撤离区开放。
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

截图：

- `rift-hunter-opening.png`
- `rift-hunter-mechanic.png`
- `rift-hunter-result.png`

## 6. 已关闭问题

| 问题 | 修复 |
|---|---|
| favicon 自动请求导致一次 404 | 三款均使用 `data:` favicon |
| 《五秒之后》减少动态开关只有 28px 高 | 提升到至少 44px |
| 生命周期事件名称不统一 | 统一为 `game_start/lifecycle_pause/lifecycle_resume` |
| 《世界缝补师》自动截图停在失败蒙层 | 验证脚本改用固定锚点胜利路线 |
| 《裂隙猎人》截图只覆盖死亡 | 增加第三段武器与成功撤离路径 |
| 自动化在结果层误触重玩 | 驱动画布前读取游戏状态，结算后停止输入 |
| 《五秒之后》只有失败结算 | 增加稳定的四编号时间门胜利序列 |

## 7. 尚未验证

- iOS 微信 WebView 的触控延迟、Web Audio 解锁、页面恢复。
- Android 高、中、低档设备的帧率、内存与后台回收。
- 微信开发者工具与公司主体的业务域名、类目和审核。
- 弱网、远程资源缓存、CDN 回滚和真实线上上报。
- 登录、云存档、分享、广告、支付、排行榜和反作弊。
- 五名以上非制作人员的无引导首局测试。

以上项目进入小流量测试前必须补齐，不能由当前浏览器结果推定。
