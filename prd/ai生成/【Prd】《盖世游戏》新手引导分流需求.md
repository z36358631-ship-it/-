# 【Prd】《盖世游戏》新手引导分流需求

## 一、版本信息

|时间|版本|变更人|主要变更内容|备注|
|---|---|---|---|---|
|2026\.06\.18|V1\.0|郑群超|创建文档||
|2026\.7\.1|V1\.1|郑群超|1、补充导入游戏拉起登录流程<br>2、补充steam绑定拉起登录流程|搜7\.1修改|
|2026\.7\.7|V1\.2|郑群超|1、补充优先扫描外接硬盘规则|搜7\.7修改|
|2026\.07\.30|V1\.3|郑群超|<span style="background-color: #FEF794;">补充新手引流与</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">两步个性化问卷</span><span style="background-color: #FEF794;">的滚动24小时交接、完成时间、国内海外差异和验收规则</span>|<span style="background-color: #FEF794;">新手引流继续独立</span>|
|2026\.07\.30|V1\.4|郑群超|<span style="background-color: #FEF794;">将</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">来源单选页并入新手引流</span><span style="background-color: #FEF794;">，放在用户类型选择与原分支之间；删除新用户24小时后手动选游戏问卷，补充断点恢复、离线补报、永久免弹、后台配置、埋点和验收。</span>|<span style="background-color: #FEF794;">V1\.4为当前规则；冲突的V1\.3规则已由V1\.4覆盖</span>|
|2026\.07\.31|V1\.5|郑群超|<span style="background-color: #FEF794;">国内、海外“我是新手”分支第三页增加</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">三段全亮顶部进度条</span><span style="background-color: #FEF794;">，明确分支范围、安全区、横竖屏状态保持与回归验收；同步将原文失效飞书临时图示替换为固定Git图片。</span>|<span style="background-color: #FEF794;">仅调整第三页进度表达，不新增接口、业务状态或埋点</span>|

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

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4当前链路</span><span style="background-color: #FEF794;">：隐私协议 → 用户类型 → 按实验组决定是否展示来源 → 原对应分支。对照组不展示来源且新手期间不写免弹；来源影响组答来源后满24小时只补选游戏；最终方案组答来源并完成引流即写 `manual_interest_exempt=true`。</span>

- <span style="background-color: #FEF794;">上一条V1\.3滚动24小时交接为历史记录，</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">已由 V1\.4 覆盖</span><span style="background-color: #FEF794;">。</span>

### 3\.4 产品指标预测

- 新用户第一天游戏体验率：\<1% → 15%

- 首屏选择分布：有游戏想玩 40% / 新手 60%（预估）

- 各路径完成率：秒玩启动 \>80% / Steam绑定 \>40% / 导入 \>30%

- 新用户次日留存率：提升 5\-8pp

### 3\.5 路径规划

- V1\.0（当前）：首屏新老用户分流 \+ 新手秒玩列表 \+ 导入自动扫描 \+ 海外引导图

- <span style="background-color: #FEF794;">V1\.3（历史）：新手引流继续独立，统一记录完成时间；满滚动24小时后的首次合格冷启动再进入两步个性化问卷。该规划已由V1\.4覆盖。</span>

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4（当前）</span><span style="background-color: #FEF794;">：来源采集并入新手引流；用户类型与原分支之间增加来源单选页；删除新用户后续手动选游戏问卷。上一条V1\.3规划已由V1\.4覆盖。</span>

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.5（当前视觉补充）</span><span style="background-color: #FEF794;">：“我是新手”国内秒玩列表与海外操作引导页统一补齐第三步进度表达；不改变V1\.4页面顺序、分流规则和数据口径。</span>

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

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4来源采集、断点恢复与永久免弹</span>

- <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.5新手第三页进度表达</span>

### 4\.2 详细设计（C端）

功能demo：[新用户分流弹窗](https://z36358631-ship-it.github.io/-/demos/%E6%96%B0%E6%89%8B%E5%BC%95%E5%AF%BC%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AFdemo.html)

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3 新手引流与两步问卷交接</span>

|<span style="background-color: #FEF794;">模块名称</span>|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3独立新手引流与24小时交接（历史）</span>|![图4.2-1：新手引流视觉统一与问卷交接](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/05-onboarding-style-alignment.png)|<span style="background-color: #FEF794;">① 新手引流继续独立承载“尽快玩上游戏”，不并入两步问卷；页面使用统一的深色引导框架，但进度和完成状态互不共用。<br>② 用户完成绑定Steam、导入、秒玩、免费游戏下载、查看更多、海外引导或主动跳过并进入目标页时，提交一次新手引流完成记录；中途关闭App、强杀或仍停留在流程内不记录完成。<br>③ 服务端首次确认完成时写入 `onboarding_completed_at`，重复完成或重复上报不得刷新时间；以该时间加24小时得到最早可触发时间，不按自然日零点计算。<br>④ 完成当次直接进入原目标页，不展示两步问卷；满24小时后也不主动唤起，只在下一次合格冷启动触发。后台回前台、Deep Link直达、推送直达、支付返回和游戏恢复不触发。<br>⑤ 断网完成时先在本机保存完成状态，避免新手引流重复出现；联网后补报，服务端以首次有效补报时间记为完成时间。补报完成前不触发两步问卷。<br>⑥ 隐私协议、强制升级、安全合规、新手引流、登录、授权、支付、下载、导入、Steam绑定、游戏恢复或更高优先级系统弹层存在时，问卷继续等待下一次合格冷启动。<br>⑦ 本行为历史方案，其中等待24小时后再展示手动选游戏＋来源问卷的规则已由V1\.4覆盖，不再作为当前开发与验收依据；其他新手完成点保留。</span>|

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4 用户类型后采集来源</span>

|<span style="background-color: #FEF794;">模块名称</span>|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">用户类型选择</span>|![图4.2-2：新手引流用户类型选择](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a88599cf88ab93cf27c2795f4288828912f96f59/public/prd/personalization-acquisition-onboarding-v2/01-onboarding-user-type.png)|<span style="background-color: #FEF794;">① 隐私协议完成后展示原用户类型页；“我有游戏想玩”和“我是新手”均不直接进入原分支。<br>② 点击任一类型后先保存用户类型与当前流程状态，再进入来源采集页。<br>③ 保存失败时停留本页并允许重试，不进入来源页；重复点击只处理一次。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">国内来源采集</span>|![图4.2-3：国内新用户来源采集](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a88599cf88ab93cf27c2795f4288828912f96f59/public/prd/personalization-acquisition-onboarding-v2/02-onboarding-source-cn.png)|<span style="background-color: #FEF794;">① </span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">用户类型选择后</span><span style="background-color: #FEF794;">、进入原分支前展示。<br>② 国内显示抖音、哔哩哔哩、小红书、应用商店、朋友推荐、其他／不记得；来源单选、必答、默认不选中，不提供跳过。<br>③ 选择后可继续；本地可靠保存成功后进入已选用户类型对应的原分支。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">海外来源采集</span>|![图4.2-4：海外新用户来源采集](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a88599cf88ab93cf27c2795f4288828912f96f59/public/prd/personalization-acquisition-onboarding-v2/03-onboarding-source-overseas.png)|<span style="background-color: #FEF794;">① 海外显示YouTube、TikTok、Reddit、Discord、Friends、Other / I don’t remember；品牌统一为GameHub。<br>② 海外包跟随App语言；来源稳定枚举、必答和保存规则与国内一致。<br>③ 海外无云游戏与新手礼包；来源完成后进入原海外新手引导图或导入/Steam分支。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">断点恢复、实验与离线补报</span>|![图4.2-5：新手来源中断恢复](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@a88599cf88ab93cf27c2795f4288828912f96f59/public/prd/personalization-acquisition-onboarding-v2/04-onboarding-source-resume.png)|<span style="background-color: #FEF794;">① 用户类型、来源选择、选项版本、实验组和流程状态每次变化后本地保存；方向切换、关闭、强杀或崩溃后恢复。<br>② 对照组不展示来源，直接进入原分支且不写免弹；来源影响组在新手内答来源，满24小时后只补选游戏，提交或跳过后写免弹；最终方案组完成引流即写免弹。<br>③ 来源已保存、原分支未完成时恢复原分支；断网时按同一 `response_id` 补报。<br>④ 来源步骤或总开关关闭时直接进入原分支，不写来源终态；重开后在下次安全入口补答。<br>⑤ 横屏使用居中可滚动容器，方向切换保留组别、页面、选择和滚动位置。</span>|

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.5 新手第三页进度</span>

|<span style="background-color: #FEF794;">模块名称</span>|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">国内／海外新手第三页</span>|![图4.2-6：国内新手第三页三段全亮进度](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/01-domestic-third-step.png)<br>![图4.2-7：海外新手第三页三段全亮进度](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/02-overseas-third-step.png)|<span style="background-color: #FEF794;">① 仅“我是新手／I'm new”分支展示本进度条；国内秒玩游戏列表、海外操作引导页均显示3段且全部点亮，表示“第3步，共3步”。<br>② “我有游戏想玩／I have games to play”分支不展示本进度条，原导入、Steam绑定路径不变。<br>③ 进度条为只读状态表达，不支持点击、滑动或返回跳步；国内无障碍文案为“独立新手引流，第3步，共3步”，海外为“GameHub onboarding, step 3 of 3”。<br>④ 国内进入页面时可继续展示原新手礼包浮层；浮层按原规则消失后，进度条正常显示且无残影，不改变游戏列表、秒玩、免费和查看更多交互。<br>⑤ 海外进度条使用独立顶部安全区，不遮挡系统状态栏、引导图、分页点和底部按钮；轮播、Next与Get Started逻辑保持不变。<br>⑥ 横竖屏切换、应用中断恢复后保留原分支、当前页面和已有选择；恢复到第三页时仍显示三段全亮，不重新开始流程。<br>⑦ 本次仅补充前端视觉状态，不新增接口、字段、业务状态、后台配置或埋点，不改变V1\.4实验分组和免弹规则。</span>|

#### ① 引导首屏（新老用户分流）

**新用户判定条件：**

- **版本号≥6\.0：**

    - 已登录：用户没成功秒玩启动或者pc 模拟器启动过，则弹出引导

    - 未登录：纯新设备的唯一编码android\_id（卸载/重装不变）

- **版本号≤6\.0（均需登录）：**判定游戏时长小于0，则弹出引导

|模块名称|图示|展示\&交互说明|
|---|---|---|
|引导首屏|![图4.2-12：新老用户分流首屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/05-user-type-page.png)|用户查看平台特色并选择“我有游戏想玩”或“我是新手”；详细规则见下表。|

|模块名称|展示\&交互说明|
|---|---|
|页面结构|平台特色介绍区 \+ 分隔线 \+ 两个选项卡片，整体用圆角背景框包裹|
|平台特色介绍|标题"平台特色介绍："\+ 3条核心卖点：① Steam与Epic平台数据互通，海量大作应有尽有 ② 支持云游戏，无需下载一键秒玩（海外版隐藏此条） ③ AI超级插帧 \+ 虚拟按键大神方案一键套用|
|选项A：我有游戏想玩|<span style="background-color: #FEF794;">V1\.3旧直跳“点击 → 游玩方式选择页”已由V1\.4覆盖。V1\.4点击后先保存用户类型并进入来源页；来源保存后才进入原游玩方式选择页。对照组或来源开关关闭时直接进入原页且不写来源终态。</span>|
|选项B：我是新手|<span style="background-color: #FEF794;">V1\.3旧直跳“国内秒玩列表/海外操作引导图”已由V1\.4覆盖。V1\.4点击后先进入来源页；来源保存后国内进入秒玩列表、海外进入操作引导图。对照组或来源开关关闭时直接进入原分支。</span>|

#### ② 游玩方式选择（"有游戏想玩"路径）

|模块名称|图示|展示\&交互说明|
|---|---|---|
|游玩方式选择|![图4.2-13：有游戏想玩分支](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/06-has-game-branch.png)|用户选择导入游戏或绑定Steam账号；详细规则见下表。|

|模块名称|展示\&交互说明|
|---|---|
|页面结构|右上角"跳过"（跳过直接进游戏库）\+ 标题"你想怎么开始？" \+ 两个选项卡片|
|选项A：导入游戏|点击 → 进入自动扫描导入流程（见导入游戏自动扫描），需要先拉起平台登录，登录选择后自动扫描//7\.1修改|
|选项B：绑定Steam账号|点击 → 跳转Steam绑定流程，需要先拉起平台登录//7\.1修改|

##### 导入游戏自动扫描

|模块名称|图示|展示\&交互说明|
|---|---|---|
|导入游戏自动扫描|![图4.2-14：自动扫描中](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/07-import-scan-loading.png)<br>![图4.2-15：自动扫描结果](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/08-import-scan-result.png)|授权后进入扫描中状态，完成后展示已找到的游戏文件；详细规则见下表。|

|模块名称|展示\&交互说明|
|---|---|
|授权请求|首次进入时请求存储权限（一次性授权弹窗）|
|自动扫描|授权后自动扫描常见目录（Download、GAME、Android/data等），扫描过程展示加载动画，预计3\-15秒<br>优先扫描外接硬盘，如无则跳过//2026\.7\.7修改|
|扫描结果\-找到|展示游戏文件列表（游戏封面\+游戏名\+文件路径），默认全部勾选。底部"导入并进入游戏库"按钮|
|扫描结果\-未找到|展示"未检测到游戏文件"提示 \+ 两个选项：① 手动选择文件夹\-点击后拉起平台导入游戏弹窗 ② 去看看其他游戏（跳转探索页）|
|导入完成|导入成功后自动跳转游戏库，高亮刚导入的游戏|

#### ③ 新手秒玩游戏列表（国内版）

|模块名称|图示|展示\&交互说明|
|---|---|---|
|新手秒玩游戏列表|![图4.2-8：国内新手秒玩游戏列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/01-domestic-third-step.png)<br>![图4.2-9：国内新手礼包浮层](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/03-domestic-gift-overlay.png)|进入页面先展示新手礼包浮层，浮层消失后用户浏览云游戏与免费游戏列表；详细规则见下表。|

|模块名称|展示\&交互说明|
|---|---|
|礼盒弹窗|进入页面时居中弹出礼盒卡片："已赠送新手礼包 / 获得15分钟免费秒玩时长"，2秒后自动消失|
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

|模块名称|图示|展示\&交互说明|
|---|---|---|
|海外新手操作引导|![图4.2-10：海外新手操作引导第1张](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/02-overseas-third-step.png)<br>![图4.2-11：海外新手操作引导第2张](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@bff4c1dc5570025a84a5ee2a38f7d274ce80b61b/public/prd/onboarding-third-step-progress/04-overseas-guide-slide-2.png)|用户依次查看导入游戏与绑定Steam两张引导图；详细规则见下表。|

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
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3与问卷关系（历史）</span>|<span style="background-color: #FEF794;">V1\.3原规则：“永不再触发”只指本新手引流；两步个性化问卷按 `onboarding_completed_at` 满滚动24小时后的首次合格冷启动独立判断。该滚动24小时触发规则已由V1\.4覆盖，不再执行。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4来源页恢复</span>|<span style="background-color: #FEF794;">用户类型已选、来源未保存：恢复来源页；来源已保存、原分支未完成：恢复原分支；整条引流已完成：不再展示本流程。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4免弹时机</span>|<span style="background-color: #FEF794;">对照组新手期间不写免弹，完成满24小时后的游戏＋来源才写；来源影响组满24小时后完成或跳过游戏才写；最终方案组完成新手引流即写。V1\.3滚动24小时只允许在对照组/来源影响组隔离执行。</span>|

#### ⑥  国内/海外差异

|差异点|国内包（盖世游戏）|海外包（GameHub）|
|---|---|---|
|首屏文案|中文|英文|
|平台特色介绍|3条（含云游戏）|2条（隐藏云游戏）|
|"我是新手"路径|秒玩游戏列表 \+ 赠送15分钟|2张操作引导图（导入/Steam绑定）→ 进探索页|
|秒玩能力|有|**无**|
|导入游戏|支持|支持（海外包受存储权限限制，需单独处理Android权限）|
|新手礼包|赠送15分钟秒玩时长|无（无云游戏）|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">来源题目</span>|<span style="background-color: #FEF794;">中文，盖世游戏</span>|<span style="background-color: #FEF794;">跟随App语言，品牌统一为GameHub</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">来源选项</span>|<span style="background-color: #FEF794;">抖音、哔哩哔哩、小红书、应用商店、朋友推荐、其他／不记得</span>|<span style="background-color: #FEF794;">YouTube、TikTok、Reddit、Discord、Friends、Other / I don’t remember</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.5第三页进度</span>|<span style="background-color: #FEF794;">秒玩游戏列表顶部显示3段全亮；保留新手礼包浮层</span>|<span style="background-color: #FEF794;">操作引导图顶部安全区显示3段全亮；无礼包浮层</span>|

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">⑦ 个性化问卷衔接</span>

<span style="background-color: #FEF794;">V1\.3原规则：新手引流与个性化问卷是两个独立流程。新用户完成任一新手引流路径后记录 `onboarding_completed_at`，本次启动不再叠加个性化问卷；满滚动24小时后的首次合格冷启动进入两步问卷。第一步可选择3\-9款游戏或暂不选择，第二步来源单选、必答、不可跳过。新手行为仍可用于后续推荐，但不能替代用户明确选择，也不能把来源答案写入兴趣标签。该方案为历史记录，已由V1\.4覆盖。</span>

<span style="background-color: #FEF794;">V1\.3原覆盖关系：本节覆盖V1\.2及以前“新用户不再手动选择游戏、仅以行为采集替代”的冲突规则。该覆盖关系现已由V1\.4再次调整。</span>

<span style="background-color: #FEF794;">V1\.4当前规则按实验组执行：对照组新手内不答来源、不写免弹，满24小时后保留选游戏＋来源；来源影响组新手内答来源，满24小时后只补选游戏，完成或跳过后写免弹；最终方案组新手内答来源，完成引流即写免弹。兴趣仅由游戏启动、游戏导入、Steam游戏库同步等实际行为生成，画像未就绪时使用推荐池兜底。</span>

|<span style="background-color: #FEF794;">身份与来源冲突场景</span>|<span style="background-color: #FEF794;">处理方式</span>|
|---|---|
|<span style="background-color: #FEF794;">游客离线答案A登录账号已有答案B</span>|<span style="background-color: #FEF794;">安装级A继续按原 `response_id` 补报，固定归属原 `install_id`/`new_user_onboarding`，不覆盖账号B；当前问卷按账号B终态放行，并记录冲突日志。不得取消A或生成新答案。</span>|
|<span style="background-color: #FEF794;">游客离线答案A登录账号无答案</span>|<span style="background-color: #FEF794;">A按同一 `response_id` 一次性关联账号，补报仍保留原 `install_id` 和入口组；重复登录或补报不得生成第二份答案。</span>|

<span style="background-color: #FEF794;">本节覆盖V1\.3新用户滚动24小时问卷规则；V1\.2及以前与“新用户不再手动选游戏、以行为生成兴趣”一致的部分恢复为当前规则。</span>

### 4\.3 详细设计（B端）

新版专题管理\-新增2个专题位置类型，分别为新手推荐池（云游戏）、新手推荐池（免费游戏），供此页面调用，其余功能均复用

|模块名称|图示|展示\&交互说明|
|---|---|---|
|新手推荐池专题类型|—（复用现有专题管理页）|专题管理新增“新手推荐池（云游戏）”和“新手推荐池（免费游戏）”两种位置类型，供新手秒玩列表调用；其余功能复用现有能力。|

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4新手来源配置</span>

|<span style="background-color: #FEF794;">模块名称</span>|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">来源配置列表</span>|<span style="background-color: #FEF794;">—</span>|<span style="background-color: #FEF794;">① 筛选区支持配置ID/实验ID、市场、状态、目标用户、版本/渠道、操作人和生效时间；多个条件取交集。<br>② 列表字段：配置ID、实验ID、总开关、市场、版本/渠道、目标用户、三组权重、护栏阈值、生效时间、选项版本、状态、操作人、操作时间；每页20条。<br>③ 状态为草稿、待生效、运行中、正常结束、手动停止、护栏停止、已删除；仅草稿可删除。<br>④ 初始空、筛选空和加载失败分别展示对应状态并保留筛选。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">配置新增与编辑</span>|<span style="background-color: #FEF794;">—</span>|<span style="background-color: #FEF794;">① 支持新增、查看、编辑、复制、草稿软删除和启停。复制生成草稿并清空生效时间；删除前二次确认。<br>② 草稿可编辑全部字段；已生效配置不可修改市场和稳定枚举，只能停用后复制为新版本。<br>③ 保存时统一校验必填、版本范围、灰度、生效时间、来源数量、枚举唯一性和兜底项；并发冲突拒绝保存并提示刷新。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">权限与操作日志</span>|<span style="background-color: #FEF794;">—</span>|<span style="background-color: #FEF794;">① 产品管理员可增删查改、发布和停止；指定运营可新增、编辑、复制、发布和停止；数据分析及客服只读。<br>② 日志记录操作人、角色、操作时间、动作、配置版本、修改前后和请求标识，支持按配置ID、操作人和时间查询。<br>③ 除草稿外的配置均不可硬删除，保证历史来源答案可按原选项版本解释。</span>|

|<span style="background-color: #FEF794;">配置项</span>|<span style="background-color: #FEF794;">规则</span>|
|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">总开关</span>|<span style="background-color: #FEF794;">关闭时临时绕过受控步骤，不写完成/跳过终态；新用户来源关闭时直接进入原分支。重开后在下次安全入口补答，不清除草稿、答案、终态或免弹状态。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">市场</span>|<span style="background-color: #FEF794;">国内、海外分开配置；国内包中文固定，海外包支持多语言并统一使用GameHub。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">目标版本</span>|<span style="background-color: #FEF794;">配置最低和最高适用版本；最低版本不得高于最高版本。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">目标用户/步骤开关</span>|<span style="background-color: #FEF794;">新用户来源页、非新用户游戏步骤、非新用户来源步骤分别独立开启；关闭时临时绕过且不写终态，重开后在下次安全入口补答。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">灰度比例</span>|<span style="background-color: #FEF794;">0\-100%的整数；使用稳定安装标识分桶，登录后同一账号保持实验组稳定。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">生效时间</span>|<span style="background-color: #FEF794;">格式YYYY\-MM\-DD HH:mm，结束时间必须晚于开始时间，按服务端时区判断。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">来源选项与顺序</span>|<span style="background-color: #FEF794;">每个市场最多5个主要渠道＋1个“其他／不记得”；主要渠道支持排序，兜底项固定最后且不可删除或停用。用户可见名称按语言填写1\-20个字符，去除首尾空格后校验，不允许纯空格或敏感词；海外启用语言缺少文案时不可发布。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">选项版本</span>|<span style="background-color: #FEF794;">修改枚举含义或选项集合时生成新的 `option_version`；进行中的流程继续使用首次曝光版本。</span>|

|<span style="background-color: #FEF794;">实验配置项</span>|<span style="background-color: #FEF794;">规则</span>|
|---|---|
|<span style="background-color: #FEF794;">实验ID与范围</span>|<span style="background-color: #FEF794;">`experiment_id` 创建后不可改；配置国内/海外市场、版本/渠道和起止时间。同一市场、版本、渠道和时间段互斥。</span>|
|<span style="background-color: #FEF794;">三组权重</span>|<span style="background-color: #FEF794;">默认80/10/10，整数且合计100，只能草稿态修改；启动后稳定分桶冻结，登录后组别不变。</span>|
|<span style="background-color: #FEF794;">护栏</span>|<span style="background-color: #FEF794;">`guardrail_drop_pp` 默认且本次固定1\.5个百分点，创建时锁定。</span>|
|<span style="background-color: #FEF794;">状态</span>|<span style="background-color: #FEF794;">草稿、待生效、运行中、正常结束、`stopped_manual`、`stopped_guardrail`；停止后不可恢复，只能复制新实验。</span>|

## 五、非功能需求

|需求类型|详细要求|
|---|---|
|性能|秒玩列表游戏封面懒加载，首屏8张图2秒内完成渲染。自动扫描5秒内返回结果|
|兼容性|<span style="background-color: #FEF794;">Android 8\.0\+、iOS 14\+；V1\.4新手来源页支持横竖屏。横屏使用居中可滚动容器，方向切换保留实验组、步骤、选择和滚动位置。</span>|
|容错|游戏封面加载失败展示占位色块\+游戏名。扫描超时10秒后提示"扫描超时，请手动选择"|
|降级|秒玩列表接口异常时展示本地缓存游戏。接口完全不可用时跳过引导直接进探索页|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3交接一致性</span>|<span style="background-color: #FEF794;">完成时间以服务端首次有效记录为准，重复请求幂等；离线时先保存本机完成状态，联网后补报。新手引流完成记录失败不阻断用户进入原目标页。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3弹层互斥</span>|<span style="background-color: #FEF794;">新手引流与两步问卷不得同次叠加；隐私、强更、安全合规及业务关键流程优先，问卷顺延到下一次合格冷启动。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4来源可靠性</span>|<span style="background-color: #FEF794;">用户类型、来源选择、选项版本和流程状态本地写入成功后才进入下一页；来源提交使用响应标识防重，服务端补报失败按退避策略重试，不生成重复答案。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4加载与降级</span>|<span style="background-color: #FEF794;">来源配置2秒内未返回时使用最近一次完整缓存或包内默认6项；两者均不可用时停留来源页并提供重试，不绕过必答。图标失败显示平台首字母，不影响选择。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4数据一致性</span>|<span style="background-color: #FEF794;">免弹按实验组时机写入。游客离线A登录账号有B时，A按原 `response_id`/`install_id` 补报且不覆盖B，当前按B终态放行并记冲突日志；账号无B时A一次性关联。不得取消A或生成新答案。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4隐私与多语言</span>|<span style="background-color: #FEF794;">只采集来源枚举，不申请额外系统权限。国内包中文不可切换；海外包跟随App语言，品牌使用GameHub，不出现GaishiGame。来源文本超长时最多显示2行，超出截断。</span>|

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
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_complete（V1\.3历史）</span>|<span style="background-color: #FEF794;">引导完成</span>|<span style="background-color: #FEF794;">用户完成任一路径离开引导并首次写入完成记录；历史24小时交接部分已由V1\.4覆盖</span>|<span style="background-color: #FEF794;">route\_type、duration\_from\_start、onboarding\_completed\_at、next\_eligible\_at、sync\_status</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_handoff\_sync（V1\.3历史）</span>|<span style="background-color: #FEF794;">完成时间补报结果</span>|<span style="background-color: #FEF794;">离线完成后联网补报成功或失败；历史24小时交接部分已由V1\.4覆盖</span>|<span style="background-color: #FEF794;">route\_type、result、retry\_count、onboarding\_completed\_at</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_complete\_v2</span>|<span style="background-color: #FEF794;">V1\.4引导完成</span>|<span style="background-color: #FEF794;">来源已保存且用户完成原分支，首次写入完成终态</span>|<span style="background-color: #FEF794;">route\_type、source\_code、response\_id、manual\_interest\_exempt、duration\_from\_start</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_source\_view</span>|<span style="background-color: #FEF794;">新用户来源页曝光</span>|<span style="background-color: #FEF794;">来源页完整展示</span>|<span style="background-color: #FEF794;">market、user\_type、option\_version、entry\_group、experiment\_group</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_source\_select</span>|<span style="background-color: #FEF794;">新用户来源选择</span>|<span style="background-color: #FEF794;">选择或切换来源项</span>|<span style="background-color: #FEF794;">source\_code、option\_position、option\_version</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_source\_submit</span>|<span style="background-color: #FEF794;">新用户来源完成</span>|<span style="background-color: #FEF794;">来源本地可靠保存成功</span>|<span style="background-color: #FEF794;">source\_code、entry\_group、experiment\_id、experiment\_group、response\_id、install\_id、market、option\_version、sync\_status</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_source\_sync</span>|<span style="background-color: #FEF794;">新用户来源补报</span>|<span style="background-color: #FEF794;">待补报答案联网同步成功或失败</span>|<span style="background-color: #FEF794;">entry\_group、experiment\_id、experiment\_group、response\_id、install\_id、result、retry\_count</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">onboarding\_flow\_resume</span>|<span style="background-color: #FEF794;">新手流程恢复</span>|<span style="background-color: #FEF794;">启动时恢复来源页或原分支</span>|<span style="background-color: #FEF794;">resume\_step、user\_type、source\_terminal</span>|

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
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">next\_eligible\_at</span>|string|否|<span style="background-color: #FEF794;">V1\.3原定义：完成时间加24小时后的最早问卷触发时间。该字段已由V1\.4覆盖，新版本不再写入或读取</span>|2026\-07\-31T10:30:00\+08:00|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">sync\_status</span>|string|否|<span style="background-color: #FEF794;">完成记录同步状态</span>|pending / synced / failed|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">result</span>|string|否|<span style="background-color: #FEF794;">补报结果</span>|success / failed|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">retry\_count</span>|int|否|<span style="background-color: #FEF794;">补报重试次数</span>|0 / 1 / 2|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">market</span>|string|是|<span style="background-color: #FEF794;">来源页市场</span>|domestic / overseas|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">source\_code</span>|string|否|<span style="background-color: #FEF794;">来源稳定枚举</span>|douyin / youtube / other\_or\_unknown|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">option\_version</span>|string|否|<span style="background-color: #FEF794;">首次曝光的来源选项版本</span>|domestic\_v1 / overseas\_v1|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">option\_position</span>|int|否|<span style="background-color: #FEF794;">来源项展示位置，从1开始</span>|1 / 6|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">entry\_group</span>|string|是|<span style="background-color: #FEF794;">来源答案入口组</span>|new\_user\_onboarding|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">response\_id</span>|string|否|<span style="background-color: #FEF794;">来源回答幂等标识；作用域为原 install\_id＋new\_user\_onboarding，登录和补报不变</span>|source\_20260730\_ab12|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">manual\_interest\_exempt</span>|boolean|是|<span style="background-color: #FEF794;">是否永久免于手动选游戏问卷</span>|true / false|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">resume\_step</span>|string|否|<span style="background-color: #FEF794;">恢复的流程页面</span>|source / original\_branch|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">source\_terminal</span>|boolean|否|<span style="background-color: #FEF794;">来源是否已本地可靠保存</span>|true / false|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">experiment\_group</span>|string|否|<span style="background-color: #FEF794;">本轮实验组</span>|control / source\_impact / final\_plan|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">experiment\_id</span>|string|否|<span style="background-color: #FEF794;">实验唯一标识，来源提交和补报固定携带</span>|acq\_20260730\_01|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">install\_id</span>|string|是|<span style="background-color: #FEF794;">安装级稳定分桶和来源归属，离线补报保持原值</span>|install\_8f21|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">guardrail\_drop\_pp</span>|float|否|<span style="background-color: #FEF794;">实验护栏绝对下降阈值，创建时锁定</span>|1\.5|

## 七、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">验收标准</span>

|模块|测试场景|预期结果|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3交接（历史，已由V1\.4覆盖）</span>|<span style="background-color: #FEF794;">AC\-01 当次不叠加</span>|<span style="background-color: #FEF794;">V1\.3原预期：完成任一新手引流路径后进入原目标页，当次启动不展示两步问卷。历史规则，已由V1\.4覆盖，不作为当前验收。</span>|
||<span style="background-color: #FEF794;">AC\-02 滚动24小时</span>|<span style="background-color: #FEF794;">V1\.3原预期：按服务端完成时间连续计算24小时，不按自然日零点；未满24小时的冷启动不展示问卷。历史规则，已由V1\.4覆盖。</span>|
||<span style="background-color: #FEF794;">AC\-03 合格冷启动</span>|<span style="background-color: #FEF794;">V1\.3原预期：满24小时后不主动唤起；下一次满足开关、市场、版本、灰度且无高优先级流程的冷启动才展示问卷。历史规则，已由V1\.4覆盖。</span>|
||<span style="background-color: #FEF794;">AC\-04 中途退出</span>|<span style="background-color: #FEF794;">V1\.3原预期：用户在新手引流中途关闭或强杀App，不记录完成时间；下次启动恢复新手引流，不进入问卷。历史触发部分已覆盖；V1\.4恢复逻辑见AC\-11。</span>|
||<span style="background-color: #FEF794;">AC\-05 完成幂等</span>|<span style="background-color: #FEF794;">V1\.3原预期：同一设备或账号重复提交完成记录，只保留首次有效 `onboarding_completed_at`，不得重新顺延24小时。历史24小时口径已覆盖；完成记录幂等要求继续保留。</span>|
||<span style="background-color: #FEF794;">AC\-06 离线补报</span>|<span style="background-color: #FEF794;">V1\.3原预期：断网完成后不重复展示新手引流；联网补报成功后开始服务端24小时计时，补报前不展示问卷。历史计时规则已覆盖；来源离线补报按AC\-12执行。</span>|
||<span style="background-color: #FEF794;">AC\-07 新旧规则覆盖</span>|<span style="background-color: #FEF794;">V1\.3原预期：新用户满24小时后仍可进入“选游戏＋来源”两步问卷，新手行为只作为推荐补充，不替代用户明确选择。该规则已由V1\.4覆盖；新用户不再进入手动选游戏问卷。</span>|
||<span style="background-color: #FEF794;">AC\-08 国内/海外</span>|<span style="background-color: #FEF794;">V1\.3原预期：国内保留秒玩和礼包；海外不出现云游戏或礼包，品牌统一为GameHub；两个市场均执行同一24小时交接规则。国内/海外业务差异继续保留，旧24小时交接不再执行。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.4当前规则</span>|<span style="background-color: #FEF794;">AC\-09 页面顺序</span>|<span style="background-color: #FEF794;">来源影响组、最终方案组执行“隐私协议 → 用户类型 → 来源单选必答 → 原对应分支”，两种用户类型都先经过来源页；对照组不展示来源页，用户类型选择后直接进入原对应分支。</span>|
||<span style="background-color: #FEF794;">AC\-10 来源必答</span>|<span style="background-color: #FEF794;">来源影响组、最终方案组的来源页单选、必答、默认不选中；未选择时不可继续，页面无跳过，国内和海外各显示正确6项及兜底项。对照组不展示来源页，不执行本条必答校验。</span>|
||<span style="background-color: #FEF794;">AC\-11 断点恢复</span>|<span style="background-color: #FEF794;">用户类型已选、来源未完成时恢复来源页和草稿；来源已完成、原分支未完成时恢复原分支，不重复展示来源页。</span>|
||<span style="background-color: #FEF794;">AC\-12 离线补报</span>|<span style="background-color: #FEF794;">断网时来源本地可靠保存后进入原分支并标记待补报；联网后按同一响应标识成功补报，不生成重复答案。</span>|
||<span style="background-color: #FEF794;">AC\-13 免弹时机</span>|<span style="background-color: #FEF794;">对照组完成后续游戏＋来源才写免弹；来源影响组完成/跳过后续游戏才写；最终方案组完成引流即写。三个时机互不串组。</span>|
||<span style="background-color: #FEF794;">AC\-14 行为画像与兜底</span>|<span style="background-color: #FEF794;">新用户兴趣由启动、导入、Steam游戏库同步生成；`behavior_profile_ready=false`、画像为空或推荐服务异常时，使用推荐池兜底。</span>|
||<span style="background-color: #FEF794;">AC\-15 数据隔离</span>|<span style="background-color: #FEF794;">新用户来源标记 `new_user_onboarding`，不进入兴趣标签，不覆盖客观安装归因，也不与 `existing_user_recall` 合并统计。</span>|
||<span style="background-color: #FEF794;">AC\-16 国内/海外</span>|<span style="background-color: #FEF794;">国内显示盖世游戏和国内6项，保留秒玩与礼包；海外显示GameHub和海外6项，不出现云游戏、礼包或GaishiGame。</span>|
||<span style="background-color: #FEF794;">AC\-17 配置与稳定分桶</span>|<span style="background-color: #FEF794;">总开关、市场、版本、目标用户、灰度和生效时间均正确生效；同一稳定安装标识和登录账号保持实验组稳定。</span>|
||<span style="background-color: #FEF794;">AC\-18 后台增删查改</span>|<span style="background-color: #FEF794;">按权限完成新增、查询、编辑、复制、草稿软删除和启停；并发冲突拒绝保存，所有操作可按配置ID追溯。</span>|
||<span style="background-color: #FEF794;">AC\-19 路由与开关</span>|<span style="background-color: #FEF794;">用户类型点击先进入来源，保存后才进原分支；来源或总开关关闭时直接进原分支且不写终态，重开后下次安全入口补答。</span>|
||<span style="background-color: #FEF794;">AC\-20 横竖屏</span>|<span style="background-color: #FEF794;">横屏使用居中可滚动容器；方向切换保留实验组、页面、来源选择和滚动位置。</span>|
||<span style="background-color: #FEF794;">AC\-21 游客登录冲突</span>|<span style="background-color: #FEF794;">A按原 `response_id`/`install_id` 补报，不覆盖账号B；按B终态放行并记录冲突日志。账号无B时A只关联一次。</span>|
||<span style="background-color: #FEF794;">AC\-22 实验配置</span>|<span style="background-color: #FEF794;">默认80/10/10，整数合计100且仅草稿态可改；相同市场/版本/渠道/时间范围互斥；启动后分桶冻结。</span>|
||<span style="background-color: #FEF794;">AC\-23 护栏边界</span>|<span style="background-color: #FEF794;">D1成熟且对照/最终各≥1000安装后每日计算；=1\.5个百分点不触发，>1\.5连续2个自然日自动 `stopped_guardrail`，新流量回对照，已入组不变。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.5第三页进度</span>|<span style="background-color: #FEF794;">AC\-24 分支范围</span>|<span style="background-color: #FEF794;">选择“我是新手／I'm new”并完成来源采集后，国内秒玩游戏列表、海外操作引导页显示进度条；“我有游戏想玩／I have games to play”分支不显示。</span>|
||<span style="background-color: #FEF794;">AC\-25 国内第三页</span>|<span style="background-color: #FEF794;">国内页显示3段且全部点亮，无障碍文案为“独立新手引流，第3步，共3步”；礼包浮层消失后进度条完整、无残影，游戏列表与原按钮正常操作。</span>|
||<span style="background-color: #FEF794;">AC\-26 海外第三页</span>|<span style="background-color: #FEF794;">海外页显示3段且全部点亮，无障碍文案为“GameHub onboarding, step 3 of 3”；顶部安全区不遮挡状态栏、引导图、分页点、Next或Get Started。</span>|
||<span style="background-color: #FEF794;">AC\-27 方向与恢复</span>|<span style="background-color: #FEF794;">第三页横竖屏切换或中断恢复后仍保持原分支和页面状态，进度条持续显示3段全亮，不重复礼包、来源提交或流程完成记录。</span>|
||<span style="background-color: #FEF794;">AC\-28 回归与数据</span>|<span style="background-color: #FEF794;">进度条不可点击，不改变国内游戏列表、海外轮播及原返回/完成逻辑；网络请求、业务字段、后台配置和埋点与V1\.4保持一致。</span>|

## 八、运营需求

1. **新手秒玩游戏池配置**：运营需在后台维护"新手秒玩游戏池"，仅含支持秒玩的游戏，建议初始30\-50款，按热度排序

2. **游戏池更新频率**：每周更新一次，结合当周热门和新增秒玩游戏

3. **海外引导图素材**：运营需提供2张引导图的正式设计稿（当前使用占位图）

4. **数据监控\&数据看包**：上线后每日关注首屏选择分布、秒玩启动率、导入成功率、海外引导完成率

5. <span style="background-color: #FEF794;">V1\.4来源配置：国内、海外分别确认5个主要渠道、1个“其他／不记得”兜底项、多语言文案、顺序和 `option_version`；修改枚举含义时必须新建版本。</span>

6. <span style="background-color: #FEF794;">V1\.4上线监控：按市场、渠道包和实验组监控来源页完成率、平均答题时间、“其他／不记得”占比、本地保存成功率、补报成功率、重复触发率、行为画像生成率、首次有效价值行为率、D1和D7。</span>

## 九、来自功能上线后的更新

（上线后记录）

## 十、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">自检记录</span>

|检查项|结论|对应位置|
|---|---|---|
|<span style="background-color: #FEF794;">端侧与市场</span>|<span style="background-color: #FEF794;">C端；国内与海外。海外品牌统一使用GameHub，云游戏仅国内保留。</span>|<span style="background-color: #FEF794;">4\.2、⑥国内/海外差异</span>|
|<span style="background-color: #FEF794;">V1\.3历史触发与状态</span>|<span style="background-color: #FEF794;">滚动24小时、合格冷启动和最早触发时间为历史口径，已由V1\.4覆盖。</span>|<span style="background-color: #FEF794;">4\.2 V1\.3、七</span>|
|<span style="background-color: #FEF794;">异常与边界</span>|<span style="background-color: #FEF794;">已覆盖来源加载失败、本地写入失败、中途退出、离线补报、重复提交、身份合并、并发配置和高优先级流程。</span>|<span style="background-color: #FEF794;">4\.2 V1\.4、4\.3、五、七</span>|
|<span style="background-color: #FEF794;">数据与验收</span>|<span style="background-color: #FEF794;">已补来源曝光、选择、完成、补报、流程恢复、永久免弹和18条新旧规则验收。</span>|<span style="background-color: #FEF794;">六、七</span>|
|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">V1\.3新增1张图示位于4\.2表格“图示”列，使用固定提交8d57a53c8deb06f9cb11e45610c6328e727e915c。</span>|<span style="background-color: #FEF794;">4\.2 V1\.3</span>|
|<span style="background-color: #FEF794;">V1\.4触发与状态</span>|<span style="background-color: #FEF794;">已写页面顺序、来源必答、断点恢复、离线补报、永久免弹、行为画像兜底和身份状态合并。</span>|<span style="background-color: #FEF794;">4\.2 V1\.4、五、七</span>|
|<span style="background-color: #FEF794;">V1\.4后台能力</span>|<span style="background-color: #FEF794;">已写总开关、市场、版本、目标用户、稳定灰度、生效时间、来源选项/顺序/版本、筛选分页、增删查改、权限和日志。</span>|<span style="background-color: #FEF794;">4\.3 V1\.4</span>|
|<span style="background-color: #FEF794;">V1\.4输入与状态</span>|<span style="background-color: #FEF794;">已写来源文案长度、空格与敏感词校验、多语言完整性、配置状态枚举与流转，以及页面返回保留草稿。</span>|<span style="background-color: #FEF794;">4\.2 V1\.4、4\.3 V1\.4</span>|
|<span style="background-color: #FEF794;">V1\.4国内/海外</span>|<span style="background-color: #FEF794;">国内使用盖世游戏和中文选项；海外使用GameHub、多语言选项，无云游戏与礼包。</span>|<span style="background-color: #FEF794;">4\.2“国内/海外差异”</span>|
|<span style="background-color: #FEF794;">V1\.4图示</span>|<span style="background-color: #FEF794;">4张V1\.4图示均在4\.2表格“图示”列，使用固定提交a88599cf88ab93cf27c2795f4288828912f96f59；旧1张V1\.3图示保留原提交。</span>|<span style="background-color: #FEF794;">4\.2 V1\.4</span>|
|<span style="background-color: #FEF794;">V1\.5状态完整性</span>|<span style="background-color: #FEF794;">已覆盖仅新手分支展示、国内/海外三段全亮、非新手分支不展示、礼包浮层消失、海外安全区、横竖屏与中断恢复。</span>|<span style="background-color: #FEF794;">4\.2 V1\.5、七 AC\-24～AC\-27</span>|
|<span style="background-color: #FEF794;">V1\.5无障碍与回归</span>|<span style="background-color: #FEF794;">已明确中英文无障碍文案、进度条只读，以及不新增接口、状态、后台配置和埋点。</span>|<span style="background-color: #FEF794;">4\.2 V1\.5、七 AC\-28</span>|
|<span style="background-color: #FEF794;">V1\.5图示</span>|<span style="background-color: #FEF794;">本次新增2张第三页图示，并将原文10个飞书临时图片清理：C端以8张真实Demo截图替换，统一使用固定提交bff4c1dc5570025a84a5ee2a38f7d274ce80b61b；B端2张失效旧图改为“复用现有专题管理页”。所有图片均位于表格“图示”列。</span>|<span style="background-color: #FEF794;">4\.2 V1\.5、①～④、4\.3</span>|
|<span style="background-color: #FEF794;">前端硬伤回填</span>|<span style="background-color: #FEF794;">已补用户类型先来源后分支、独立开关临时绕过、横竖屏状态保持、三组免弹时机和游客来源冲突。</span>|<span style="background-color: #FEF794;">4\.2、五</span>|
|<span style="background-color: #FEF794;">测试硬伤回填</span>|<span style="background-color: #FEF794;">已补开关重开补答、80/10/10权重、实验互斥、护栏样本门槛、连续自然日和=1\.5边界。</span>|<span style="background-color: #FEF794;">七</span>|
|<span style="background-color: #FEF794;">运营硬伤回填</span>|<span style="background-color: #FEF794;">已补实验ID、市场/版本/渠道、起止时间、固定护栏、状态流转、自动/手动停止和稳定分桶。</span>|<span style="background-color: #FEF794;">4\.3、六</span>|

**<span style="background-color: #FEF794;">V1\.3历史模拟评审结果：</span>**

|角色|结论|发现的问题|
|---|---|---|
|前端开发|✓|完成点、时间口径、问卷触发优先级和离线补报均有明确规则。|
|<span style="background-color: #FEF794;">测试工程师</span>|<span style="background-color: #FEF794;">✓</span>|<span style="background-color: #FEF794;">V1\.3历史评审已覆盖未满24小时、自然日跨天、中途退出、重复上报、断网和弹层竞争；24小时规则现已由V1\.4覆盖。</span>|
|运营/业务方|✓|新手引流继续独立，国内海外差异、数据口径和旧规则覆盖关系无歧义。|

**<span style="background-color: #FEF794;">V1\.5模拟评审结果：</span>**

|角色|结论|发现的问题与处理|
|---|---|---|
|<span style="background-color: #FEF794;">前端开发</span>|<span style="background-color: #FEF794;">✓</span>|<span style="background-color: #FEF794;">已明确进度条仅进入国内秒玩游戏列表、海外操作引导页，并复用现有页面状态；无需新增接口、状态机或后台配置。</span>|
|<span style="background-color: #FEF794;">测试工程师</span>|<span style="background-color: #FEF794;">✓</span>|<span style="background-color: #FEF794;">已补非新手分支不展示、国内礼包浮层消失、海外顶部安全区、方向切换、中断恢复、无障碍文案和原交互回归。</span>|
|<span style="background-color: #FEF794;">运营/业务方</span>|<span style="background-color: #FEF794;">✓</span>|<span style="background-color: #FEF794;">本次仅统一第三步完成感，不影响国内/海外内容差异、实验分组、运营配置与指标口径。</span>|
