# 【Prd】《盖世游戏》新手引导分流需求

## 一、版本信息

|时间|版本|变更人|主要变更内容|备注|
|---|---|---|---|---|
|2026\.06\.18|V1\.0|郑群超|创建文档||
|2026\.7\.1|V1\.1|郑群超|1、补充导入游戏拉起登录流程<br>2、补充steam绑定拉起登录流程|搜7\.1修改|
|2026\.7\.7|V1\.2|郑群超|1、补充优先扫描外接硬盘规则|搜7\.7修改|
|2026\.07\.30|V1\.3|郑群超|<span style="background-color: #FEF794;">补充新手引流与</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">两步个性化问卷</span><span style="background-color: #FEF794;">的滚动24小时交接、完成时间、国内海外差异和验收规则</span>|<span style="background-color: #FEF794;">新手引流继续独立</span>|

## 二、背景与目标

**背景：**日新增用户游戏启动成功体验率不足50%，卸载率80%，次日留存仅20%。核心原因是新用户进入探索页后面对大量 Steam 游戏内容，不知道如何开始——没有 Steam 账号的用户找不到路径，有游戏文件的用户找不到导入入口，想秒玩的用户不知道哪些游戏支持。

**目标：**在隐私政策之后新增分流引导页，根据用户类型引导至对应路径，将新用户第一天游戏体验率 提升至 50%。

## 三、故事介绍

### 3\.1 用户与运营场景

**场景一（老玩家）**：小明之前用过 PC 模拟器，首次安装新版后进入引导页 → 选择"我有游戏想玩" → 选择导入游戏 → 系统自动扫描找到游戏文件 → 一键导入 → 进入游戏库。

**场景二（新手\-国内）**：小红从未玩过，选择"我是新手" → 看到礼盒弹窗"已赠送15分钟秒玩时长" → 浏览秒玩游戏列表 → 点击感兴趣的游戏"秒玩" → 直接启动云游戏。

**场景三（新手\-海外）**：Tom 首次安装 GameHub → 选择"I'm new" → 看到 2 张操作引导图（导入游戏/绑定Steam） → 逐张阅读完毕点击 "Get Started" → 进入探索页。

### 3\.2 价值分析

- 留存：新用户当天玩上游戏，次日留存预期从当前水平提升 5\-8 个百分点

- 效率：用户从安装到进入游戏的路径缩短 60%以上



### 3\.3 核心体验路径

- 老玩家链路：隐私政策 → 引导首屏 → "我有游戏想玩" → 导入/绑定Steam → 完成对应引流动作并记录新手引流完成时间 → 进入游戏库

- 新手链路（国内）：隐私政策 → 引导首屏 → "我是新手" → 礼盒弹窗 → 秒玩游戏列表 → 点击秒玩/查看更多 → 记录新手引流完成时间 → 进入目标页

- 新手链路（海外）：隐私政策 → 引导首屏 → "I'm new" → 2张引导图 → 记录新手引流完成时间 → 进入探索页

- <span style="background-color: #FEF794;">V1\.3统一交接：任一新手路径完成 → 记录新手引流完成时间 → 本次进入原目标页，不叠加个性化问卷 → 满滚动24小时后的首次合格冷启动进入两步问卷。</span>

### 3\.4 产品指标预测

- 新用户第一天游戏体验率：\<1% → 15%

- 首屏选择分布：有游戏想玩 40% / 新手 60%（预估）

- 各路径完成率：秒玩启动 \>80% / Steam绑定 \>40% / 导入 \>30%

- 新用户次日留存率：提升 5\-8pp

### 3\.5 路径规划

- V1\.0（当前）：首屏新老用户分流 \+ 新手秒玩列表 \+ 导入自动扫描 \+ 海外引导图

- <span style="background-color: #FEF794;">V1\.3（当前补充）：新手引流继续独立，统一记录完成时间；满滚动24小时后的首次合格冷启动再进入两步个性化问卷。</span>

- V2\.0（预告）：根据用户行为动态调整探索页内容推荐策略；H5小游戏兜底路径

## 四、概要设计

### 4\.1 模块设计

- 引导首屏（新老用户分流 \+ 平台介绍）

- 新手秒玩游戏列表（国内版）

- 新手操作引导图（海外版）

- 游戏自动扫描导入模块

- 新手礼包赠送逻辑

- 设备状态判断逻辑

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">新手引流完成时间与两步问卷交接</span>

### 4\.2 详细设计（C端）

功能demo：[新用户分流弹窗](https://z36358631-ship-it.github.io/-/demos/%E6%96%B0%E6%89%8B%E5%BC%95%E5%AF%BC%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AFdemo.html)

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3 新手引流与两步问卷交接</span>

|模块名称|图示|展示\&交互说明|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">独立新手引流与24小时交接</span>|![图4.2-1：新手引流视觉统一与问卷交接](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/05-onboarding-style-alignment.png)|<span style="background-color: #FEF794;">① 新手引流继续独立承载“尽快玩上游戏”，不并入两步问卷；页面使用统一的深色引导框架，但进度和完成状态互不共用。<br>② 用户完成绑定Steam、导入、秒玩、免费游戏下载、查看更多、海外引导或主动跳过并进入目标页时，提交一次新手引流完成记录；中途关闭App、强杀或仍停留在流程内不记录完成。<br>③ 服务端首次确认完成时写入 `onboarding_completed_at`，重复完成或重复上报不得刷新时间；以该时间加24小时得到最早可触发时间，不按自然日零点计算。<br>④ 完成当次直接进入原目标页，不展示两步问卷；满24小时后也不主动唤起，只在下一次合格冷启动触发。后台回前台、Deep Link直达、推送直达、支付返回和游戏恢复不触发。<br>⑤ 断网完成时先在本机保存完成状态，避免新手引流重复出现；联网后补报，服务端以首次有效补报时间记为完成时间。补报完成前不触发两步问卷。<br>⑥ 隐私协议、强制升级、安全合规、新手引流、登录、授权、支付、下载、导入、Steam绑定、游戏恢复或更高优先级系统弹层存在时，问卷继续等待下一次合格冷启动。</span>|

#### ① 引导首屏（新老用户分流）

**新用户判定条件：**

- **版本号≥6\.0：**

    - 已登录：用户没成功秒玩启动或者pc 模拟器启动过，则弹出引导

    - 未登录：纯新设备的唯一编码android\_id（卸载/重装不变）

- **版本号≤6\.0（均需登录）：**判定游戏时长小于0，则弹出引导

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzNmMDljNmMyZWM3OTE1ZWY5YWE0MzUxNTgzZjdiNmRfOTE2NDg2MjM0MGI5ZjdlZTA2YzkyOTcxMzM3MjBlZWJfSUQ6NzY1MjY3MTIyNTI5OTM1NjkxNV8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

|模块名称|展示\&交互说明|
|---|---|
|页面结构|平台特色介绍区 \+ 分隔线 \+ 两个选项卡片，整体用圆角背景框包裹|
|平台特色介绍|标题"平台特色介绍："\+ 3条核心卖点：① Steam与Epic平台数据互通，海量大作应有尽有 ② 支持云游戏，无需下载一键秒玩（海外版隐藏此条） ③ AI超级插帧 \+ 虚拟按键大神方案一键套用|
|选项A：我有游戏想玩|icon为Steam logo，描述"已有Steam账号或游戏文件，想在手机上玩"。点击 → 进入游玩方式选择页|
|选项B：我是新手|icon为闪电，描述"没玩过，想体验一下热门游戏"。点击 → 国内版进入秒玩列表；海外版进入操作引导图|

#### ② 游玩方式选择（"有游戏想玩"路径）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTk4NGI0M2NkOWNlOThhY2Y2MGM2Yzk4ZWUzY2M1NmVfODk3ZmY2NzhkNTE1MjI2YmQ1ZDUyNzc5NjMwM2UyMmRfSUQ6NzY1MjY3MTI4NjExNjMzODY1Nl8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

|模块名称|展示\&交互说明|
|---|---|
|页面结构|右上角"跳过"（跳过直接进游戏库）\+ 标题"你想怎么开始？" \+ 两个选项卡片|
|选项A：导入游戏|点击 → 进入自动扫描导入流程（见导入游戏自动扫描），需要先拉起平台登录，登录选择后自动扫描//7\.1修改|
|选项B：绑定Steam账号|点击 → 跳转Steam绑定流程，需要先拉起平台登录//7\.1修改|

##### 导入游戏自动扫描

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NDM5NmYxZjUzMTI5Yjg0MThmMzJlMTQyNTU1NGRkZTlfOWZlY2ZiYjVkYmI2OThhYjZjZGQzMTY0ZWI4ZmY0ODlfSUQ6NzY1NDc4NDM4NDQ1Njk2OTE2Nl8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWQzMzhhZWNjNDI2NTJiM2VlYzlmMzkwZWFhNzdlNjFfNDdkMTlkOGFkZjU4MTc0NTY5YjY1ZTU0NTA5MDk4ZjBfSUQ6NzY1NDc4NDM4MTM2Njg4MTQ5Ml8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

|模块名称|展示\&交互说明|
|---|---|
|授权请求|首次进入时请求存储权限（一次性授权弹窗）|
|自动扫描|授权后自动扫描常见目录（Download、GAME、Android/data等），扫描过程展示加载动画，预计3\-15秒<br>优先扫描外接硬盘，如无则跳过//2026\.7\.7修改|
|扫描结果\-找到|展示游戏文件列表（游戏封面\+游戏名\+文件路径），默认全部勾选。底部"导入并进入游戏库"按钮|
|扫描结果\-未找到|展示"未检测到游戏文件"提示 \+ 两个选项：① 手动选择文件夹\-点击后拉起平台导入游戏弹窗 ② 去看看其他游戏（跳转探索页）|
|导入完成|导入成功后自动跳转游戏库，高亮刚导入的游戏|

#### ③ 新手秒玩游戏列表（国内版）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTMxNjU2OTIxZGE5NGZkMjg1YmU4NjlkZDNjZmMyNThfYzQzYmE3MjJkNjZjYmQyYzRlODhmOGI0ZGZkYjk3NGJfSUQ6NzY1NDgwNjM3ODk3MjAwNzY0MF8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

|模块名称|展示\&交互说明|
|---|---|
|礼盒弹窗|进入页面时居中弹出礼盒卡片："已赠送新手礼包 / 获得15分钟免费秒玩时长"，2秒后自动消失<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjFiNWNhMjU3Njg2MzcwNDNmOTBhYWM0OGJmZDg2YzFfMmVlZmMyZDI0NjAwNWU3OTBiNmJmOWFiMWFlNTY2YWNfSUQ6NzY1MjY3MTM2OTQ4MjcwMTgxMl8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)|
|页面结构|标题"选一款试试" \+ 两个分区（云游戏 / 免费游戏），各自带标题\+副标题\+游戏列表\+查看更多|
|分区一：云游戏|标题"云游戏"，副标题"无需下载，点开即玩"，右侧"查看更多 ›"。纵向列表展示8款，每条：游戏封面 \+ 游戏名 \+ 核心玩法标签 \+ 金色"秒玩"按钮|
|分区二：免费游戏|标题"免费游戏"，副标题"需下载游戏包，无限时畅玩"，右侧"查看更多 ›"。纵向列表展示最多8款，每条：游戏封面 \+ 游戏名 \+ 核心玩法标签 \+ 绿色"免费"按钮|
|优先级|云游戏分区排在上方（优先推秒玩），免费游戏分区在下方|
|秒玩按钮|点击直接启动该游戏的云游戏秒玩；以游客模式游玩|
|免费按钮|点击跳转该游戏详情页，开始下载；以游客模式游玩|
|查看更多（云游戏）|点击跳转"玩游戏"tab → 云游戏页。进入该页面时顶部提示"恭喜已获得15分钟免费游戏时长"|
|查看更多（免费游戏）|点击跳转"玩游戏"tab → PC游戏页|
|云游戏列表来源|运营后台配置的"新手推荐游戏池"，仅含支持秒玩的游戏，专题管理\-新手推荐池（云游戏）|
|免费游戏列表来源|Steam/GOG平台免费游戏（Demo版、F2P、限免），由运营后台配置，仅含已验证可在平台正常运行的游戏，专题管理\-新手推荐池（免费游戏）|



#### ④ 新手操作引导图（海外版）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDcwOTgwM2VlOThmYjEzZGM5MWRkMjk2NWEwNzVjMDlfYjg4ZGEyZTFjNDk5NzI2NDE2ZjQ2MTkxN2ZhZDBlZjBfSUQ6NzY1MjY3MTY0ODczOTEzNDQxOF8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWU0Nzg5MjM3OTEzOGI4MTVkMDdiNjY5ZGRlMTQ1NjRfOWQ0YjYwMjc4NDkyMzZlY2M1Njc5YzA3MTRkMDk3MDVfSUQ6NzY1MjY3MTUwNzM5OTMxNDM4OF8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

|模块名称|展示\&交互说明|
|---|---|
|页面结构|居中内容区（图标\+标题\+分步说明）\+ 底部圆点指示器 \+ Next按钮|
|引导图数量|2张，不可跳过，必须逐张查看|
|第1张：Import Games|图标\+标题\+操作步骤：授权存储权限 → 自动扫描或手动选择 → 确认导入进入游戏库|
|第2张：Bind Steam Account|图标\+标题\+操作步骤：点击绑定Steam → 登录Steam账号 → 游戏库自动同步|
|交互|点击"Next"切换到下一张（带滑动动画\+圆点更新）。最后一张按钮变为"Get Started"，点击进入探索页|

#### ⑤触发条件与消失逻辑

|场景|处理方式|
|---|---|
|触发条件|设备维度判断：该设备未绑定Steam \+ 未导入过游戏 \+ 未启动过任何游戏（三条件全满足）|
|覆盖范围|注册用户 \+ 匿名用户均覆盖|
|消失条件|用户完成任一路径后（成功绑定Steam / 成功导入游戏 / 成功启动秒玩），该设备永不再触发<br><span style="background-color: #FEF794;">V1\.3补充：主动跳过进入游戏库、查看更多进入目标页、开始免费游戏下载或完成海外引导，也视为新手引流完成；首次完成后记录完成时间，不再展示本新手引流。</span>|
|中途退出|关闭APP或中断流程，下次打开APP重新进入引导页|
|已完成用户|已完成过任一路径的设备，跳过引导页，直接进入探索页|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">与问卷关系</span>|<span style="background-color: #FEF794;">“永不再触发”只指本新手引流；两步个性化问卷按 `onboarding_completed_at` 满滚动24小时后的首次合格冷启动独立判断。</span>|

#### ⑥  国内/海外差异

|差异点|国内包（盖世游戏）|海外包（GameHub）|
|---|---|---|
|首屏文案|中文|英文|
|平台特色介绍|3条（含云游戏）|2条（隐藏云游戏）|
|"我是新手"路径|秒玩游戏列表 \+ 赠送15分钟|2张操作引导图（导入/Steam绑定）→ 进探索页|
|秒玩能力|有|**无**|
|导入游戏|支持|支持（海外包受存储权限限制，需单独处理Android权限）|
|新手礼包|赠送15分钟秒玩时长|无（无云游戏）|

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">⑦ 个性化问卷衔接</span>

<span style="background-color: #FEF794;">新手引流与个性化问卷是两个独立流程。新用户完成任一新手引流路径后记录 `onboarding_completed_at`，本次启动不再叠加个性化问卷；满滚动24小时后的首次合格冷启动进入两步问卷。第一步可选择3\-9款游戏或暂不选择，第二步来源单选、必答、不可跳过。新手行为仍可用于后续推荐，但不能替代用户明确选择，也不能把来源答案写入兴趣标签。</span>

<span style="background-color: #FEF794;">本节覆盖V1\.2及以前“新用户不再手动选择游戏、仅以行为采集替代”的冲突规则。</span>

### 4\.3 详细设计（B端）

新版专题管理\-新增2个专题位置类型，分别为新手推荐池（云游戏）、新手推荐池（免费游戏），供此页面调用，其余功能均复用

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWIyMmE5MGFjY2U0NGFmMWI3ZmMwOWM4NTQ1YTIxNDJfYTViYjQ2YWEyOGFlZmQ4Yjk3ZTNiZjZiNDM2MzFiNDhfSUQ6NzY1NDgxMzcyNDAxMzU2MzA3Nl8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTIyZTc4N2FlZWZkYmE0MzZmNTEyNzliMTQ5ZjYzYjJfMTRiOWU2NDMyNTU0YTc0YjJlOWU2ZjBkZDEwYTlmZDFfSUQ6NzY1NDgxMzk1NjY1MzE1NzMzMF8xNzgzNDA0ODA4OjE3ODM0OTEyMDhfVjM)

## 五、非功能需求

|需求类型|详细要求|
|---|---|
|性能|秒玩列表游戏封面懒加载，首屏8张图2秒内完成渲染。自动扫描5秒内返回结果|
|兼容性|Android 8\.0\+，iOS 14\+。仅竖屏展示|
|容错|游戏封面加载失败展示占位色块\+游戏名。扫描超时10秒后提示"扫描超时，请手动选择"|
|降级|秒玩列表接口异常时展示本地缓存游戏。接口完全不可用时跳过引导直接进探索页|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3交接一致性</span>|<span style="background-color: #FEF794;">完成时间以服务端首次有效记录为准，重复请求幂等；离线时先保存本机完成状态，联网后补报。新手引流完成记录失败不阻断用户进入原目标页。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3弹层互斥</span>|<span style="background-color: #FEF794;">新手引流与两步问卷不得同次叠加；隐私、强更、安全合规及业务关键流程优先，问卷顺延到下一次合格冷启动。</span>|

## 六、埋点需求

### 6\.1 埋点事件表

|事件ID|事件名称|触发时机|关键参数|
|---|---|---|---|
|onboarding\_page\_view|引导页曝光|引导首屏/秒玩列表/引导图页面加载完成|page\_type、screen\_orientation|
|onboarding\_user\_type\_select|用户类型选择|首屏点击"有游戏想玩"或"新手"|user\_type|
|onboarding\_route\_select|游玩方式选择|"有游戏想玩"路径中选择导入/Steam|route\_type|
|onboarding\_game\_play\_click|秒玩点击|新手列表中点击某款游戏的"秒玩"|game\_id、position|
|onboarding\_view\_more\_click|查看更多点击|新手列表底部"查看更多"|无|
|onboarding\_gift\_show|礼盒弹窗展示|礼盒弹窗出现|无|
|onboarding\_guide\_slide|引导图翻页|海外版点击Next切换|slide\_index|
|onboarding\_scan\_start|扫描开始|进入自动扫描流程|无|
|onboarding\_scan\_result|扫描结果|扫描完成|found\_count、scan\_duration|
|onboarding\_import\_confirm|导入确认|点击"导入并进入游戏库"|import\_count|
|onboarding\_complete|引导完成|用户完成任一路径离开引导并首次写入完成记录|route\_type、duration\_from\_start、onboarding\_completed\_at、next\_eligible\_at、sync\_status|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_handoff\_sync</span>|<span style="background-color: #FEF794;">完成时间补报结果</span>|<span style="background-color: #FEF794;">离线完成后联网补报成功或失败</span>|<span style="background-color: #FEF794;">route\_type、result、retry\_count、onboarding\_completed\_at</span>|

### 6\.2 埋点参数表

|参数名|类型|必填|说明|枚举/示例|
|---|---|---|---|---|
|page\_type|string|是|页面类型|welcome / route\_select / game\_list / guide\_slides / scan|
|user\_type|string|是|用户类型选择|has\_game / new\_user|
|route\_type|string|是|选择的路径类型|steam / import / instant\_play / view\_more / guide\_complete|
|game\_id|string|否|游戏ID|如 "1245620"|
|position|int|否|游戏在列表中的位置|0\-7|
|slide\_index|int|否|引导图页码|0 / 1|
|found\_count|int|否|扫描找到的游戏数量|0, 1, 2\.\.\.|
|scan\_duration|int|否|扫描耗时（毫秒）|2500|
|import\_count|int|否|实际导入的游戏数量|1, 2\.\.\.|
|duration\_from\_start|int|否|从引导开始到完成的总时长（秒）|15, 30\.\.\.|
|screen\_orientation|string|是|屏幕方向|portrait|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_completed\_at</span>|string|否|<span style="background-color: #FEF794;">服务端首次确认的新手引流完成时间；重复上报不刷新</span>|2026\-07\-30T10:30:00\+08:00|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">next\_eligible\_at</span>|string|否|<span style="background-color: #FEF794;">完成时间加24小时后的最早问卷触发时间</span>|2026\-07\-31T10:30:00\+08:00|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">sync\_status</span>|string|否|<span style="background-color: #FEF794;">完成记录同步状态</span>|pending / synced / failed|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">result</span>|string|否|<span style="background-color: #FEF794;">补报结果</span>|success / failed|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">retry\_count</span>|int|否|<span style="background-color: #FEF794;">补报重试次数</span>|0 / 1 / 2|

## 七、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">验收标准</span>

|模块|测试场景|预期结果|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3交接</span>|<span style="background-color: #FEF794;">AC\-01 当次不叠加</span>|<span style="background-color: #FEF794;">完成任一新手引流路径后进入原目标页，当次启动不展示两步问卷。</span>|
||<span style="background-color: #FEF794;">AC\-02 滚动24小时</span>|<span style="background-color: #FEF794;">按服务端完成时间连续计算24小时，不按自然日零点；未满24小时的冷启动不展示问卷。</span>|
||<span style="background-color: #FEF794;">AC\-03 合格冷启动</span>|<span style="background-color: #FEF794;">满24小时后不主动唤起；下一次满足开关、市场、版本、灰度且无高优先级流程的冷启动才展示问卷。</span>|
||<span style="background-color: #FEF794;">AC\-04 中途退出</span>|<span style="background-color: #FEF794;">用户在新手引流中途关闭或强杀App，不记录完成时间；下次启动恢复新手引流，不进入问卷。</span>|
||<span style="background-color: #FEF794;">AC\-05 完成幂等</span>|<span style="background-color: #FEF794;">同一设备或账号重复提交完成记录，只保留首次有效 `onboarding_completed_at`，不得重新顺延24小时。</span>|
||<span style="background-color: #FEF794;">AC\-06 离线补报</span>|<span style="background-color: #FEF794;">断网完成后不重复展示新手引流；联网补报成功后开始服务端24小时计时，补报前不展示问卷。</span>|
||<span style="background-color: #FEF794;">AC\-07 新旧规则覆盖</span>|<span style="background-color: #FEF794;">新用户满24小时后仍可进入“选游戏＋来源”两步问卷，新手行为只作为推荐补充，不替代用户明确选择。</span>|
||<span style="background-color: #FEF794;">AC\-08 国内/海外</span>|<span style="background-color: #FEF794;">国内保留秒玩和礼包；海外不出现云游戏或礼包，品牌统一为GameHub；两个市场均执行同一24小时交接规则。</span>|

## 八、运营需求

1. **新手秒玩游戏池配置**：运营需在后台维护"新手秒玩游戏池"，仅含支持秒玩的游戏，建议初始30\-50款，按热度排序

2. **游戏池更新频率**：每周更新一次，结合当周热门和新增秒玩游戏

3. **海外引导图素材**：运营需提供2张引导图的正式设计稿（当前使用占位图）

4. **数据监控\&数据看包**：上线后每日关注首屏选择分布、秒玩启动率、导入成功率、海外引导完成率

## 九、来自功能上线后的更新

（上线后记录）

## 十、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">自检记录</span>

|检查项|结论|对应位置|
|---|---|---|
|<span style="background-color: #FEF794;">端侧与市场</span>|<span style="background-color: #FEF794;">C端；国内与海外。海外品牌统一使用GameHub，云游戏仅国内保留。</span>|<span style="background-color: #FEF794;">4\.2、⑥国内/海外差异</span>|
|<span style="background-color: #FEF794;">触发与状态</span>|<span style="background-color: #FEF794;">已写完成点、首次完成时间、滚动24小时、合格冷启动、当次互斥和重复请求幂等。</span>|<span style="background-color: #FEF794;">4\.2 V1\.3、⑤触发条件与消失逻辑</span>|
|<span style="background-color: #FEF794;">异常与边界</span>|<span style="background-color: #FEF794;">已覆盖中途退出、离线完成、补报失败、高优先级流程竞争和服务端记录失败。</span>|<span style="background-color: #FEF794;">五、七</span>|
|<span style="background-color: #FEF794;">数据与验收</span>|<span style="background-color: #FEF794;">已补充完成时间、最早触发时间、同步状态、补报结果和8条交接验收用例。</span>|<span style="background-color: #FEF794;">六、七</span>|
|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">V1\.3新增1张图示位于4\.2表格“图示”列，使用固定提交8d57a53c8deb06f9cb11e45610c6328e727e915c。</span>|<span style="background-color: #FEF794;">4\.2 V1\.3</span>|

**模拟评审结果：**

|角色|结论|发现的问题|
|---|---|---|
|前端开发|✓|完成点、时间口径、问卷触发优先级和离线补报均有明确规则。|
|测试工程师|✓|已覆盖未满24小时、自然日跨天、中途退出、重复上报、断网和弹层竞争。|
|运营/业务方|✓|新手引流继续独立，国内海外差异、数据口径和旧规则覆盖关系无歧义。|
