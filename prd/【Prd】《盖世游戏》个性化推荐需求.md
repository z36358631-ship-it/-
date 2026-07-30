# 【Prd】《盖世游戏》个性化推荐需求

# 一、 版本信息

|**时间**|**版本**|**变更人**|**主要变更内容**|**备注**|
|---|---|---|---|---|
|2026\.2\.12|V1\.0|郑群超|创建文档||
|2026\.3\.23|V1\.1|郑群超|1、补充分类游戏显示数量限制|搜2026\.3\.23修改|
|2026\.4\.8|V1\.2|郑群超|1、兴趣采集游戏最多数量由10调整为9<br>2、选满9个时，换一批按钮置灰<br>3、兴趣采集一次性提供200个游戏，换一批超量时循环展示<br>4、探索页\-为你推荐\&全部游戏**/**玩游戏页\-PC云游戏移除缓存逻辑，一次性提供500个游戏，超量时循环展示<br>5、探索页、PC云游戏tab补充去重逻辑|搜2026\.4\.8修改|
|2026\.07\.30|V1\.3|郑群超|<span style="background-color: #FEF794;">把兴趣采集升级为</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">选游戏＋获客来源两步问卷</span><span style="background-color: #FEF794;">；补充新老用户触发、滚动24小时、国内海外选项、中断恢复、离线补报、运营配置、埋点和验收规则</span>|<span style="background-color: #FEF794;">V1\.3规则覆盖旧版冲突内容</span>|

# 二、 功能概述

## 2\.1 需求背景

- 新用户进入App后缺乏引导，系统无法快速建立用户画像，导致初期留存率（Day\-1 Retention）有提升空间。

- 当前【探索页】与【秒玩页】部分游戏列表采用静态人工，导致流量分发效率低

## 2\.2 设计目的

1. **画像冷启动**：通过交互式引导，在用户首次进入时完成基础兴趣标签采集。

2. **流量动态化**：引入“算法\+规则”混合驱动，平衡热门（正在玩）、潜力（想玩）、口碑（高分）与个性化推荐的流量分配。

3. **提升转化率**：通过个性化推荐位提升列表点击率（CTR）。



## 2\.3 竞品分析

🌟 /

|**竞品**|**主要信息**|**关键结论**|**截图或视频**|
|---|---|---|---|
|/|/|/|/|

## 2\.4 名词解释

|**术语 / 缩略词**|**说明**|
|---|---|
|**冷启动**|指新用户首次登录应用，系统无历史行为数据时的初始状态。|
|**混合排序**|将全站固定规则数据（推荐池）与个性化算法数据按特定槽位交叉排列的逻辑。|
|**推荐池**|基于ai模型自动生成的推荐池，以游戏详情CTR为模型追求指标，吸引用户点击|
|**池A \(热度\)**|基于昨日DAU排序的数据池，代表“正在玩”。|
|**池B \(潜力\)**|基于昨日详情页点击率（点击uv/曝光uv）排序的数据池，点击人数≥10人，代表“想玩/好奇”。|
|**池C \(品质\)**|基于截止昨日玩家评分排序的数据池，评分≥8\.0分，评价人数≥10人，代表“高口碑”。|

## 2\.5 功能范围

- 平台：盖世游戏竖版

- 终端：Android、iOS



# 三、 功能需求

**功能demo：**[感兴趣游戏采集demo](https://gistcdn.githack.com/z36358631-ship-it/e81053e1d029069fd002f402b7338912/raw/80764953b08a1838995198936f047b3543c9b0c8/%E9%A6%96%E6%AC%A1%E6%8E%A8%E8%8D%90%E4%B8%AA%E6%80%A7%E5%8C%96demo.html)

<span style="background-color: #FEF794;">**V1\.3功能demo：**</span>[个性化推荐与来源采集两步问卷](https://z36358631-ship-it.github.io/-/demos/%E7%94%A8%E6%88%B7%E4%B8%8E%E8%AE%BE%E7%BD%AE/%E4%B8%AA%E6%80%A7%E5%8C%96%E6%8E%A8%E8%8D%90%E9%87%87%E9%9B%86demo.html)

**UI地址：**[www\.figma\.com](https://www.figma.com/design/c229g9IEgkVnJqiPBn7jEF/GH-%E7%AB%96%E7%89%887.0?node-id=37190-7410&p=f&t=Dgh07XV1hLujbht4-0)

## 3\.1 **功能列表**

|**序号**|**模块**|**功能简述**|**优先级**|
|---|---|---|---|
|1|兴趣采集页|新用户首次登录后的引导页，支持网格点选交互，至少选择3款。|P0|
|1\.1|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">两步个性化与来源问卷</span>|<span style="background-color: #FEF794;">目标用户在合格冷启动进入两步全屏问卷：第一步选3\-9款游戏或暂不选择，第二步必须单选获客来源后完成。</span>|P0|
|2|数据池构建|每日通过ai生成用户推荐池。|P0|
|3|混合排序算法|针对指定栏目，执行前10位插空推荐\+长尾循环填充逻辑。|P0|
|4|推荐策略|基于用户游戏库或全局热度的个性化填充逻辑（过滤已安装）。|P1|
|5|全局避让规则|列表生成的后处理逻辑：去重、同类游戏连续展示避让。|P1|
|6|动态修正机制|根据用户浏览和启动行为刷新用户兴趣标签|P2|

## 3\.2 核心功能模块详情

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmE5ZmQ2ZGI1NjFkOWU2MzNiNWM4MmRmNzJhNmJjNDBfMWRiNzkyMDkxNmI5ZTFlY2RlMTE5ZmNiZWQxMzZlZDlfSUQ6NzYwNTg5MTY4NTg1NTU2MjcxNl8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

### 3\.2\.1 冷启动兴趣采集

**触发时机**：用户单个设备首次访问app，进入首页之前；后续不会重新出现
**页面布局**：

- **UI交互规范**：

    - **标题区**：“定制你的专属首页” / “挑选你感兴趣的游戏，让推荐更懂你”。

    - **内容区**：

        - 3列网格布局，展示9款高热度代表性游戏封面。

            - 依次填充“全站热度池\(池A\)”、“潜力池\(池B\)”、“高分池\(池C\)”的顺序循环填充

            - **游戏数量：**一次提供200个游戏，换一批超量时循环展示

        - 右上角“换一批”：点击随机刷新当前未选中的游戏。

            - 置灰态：当选满9个时，“换一批”按钮置灰

        - 选中态：封面出现绿色遮罩及勾选图标，最多选中3\-9款/2026\.4\.8修改

    - **底部操作区**：

        - 进度条：实时显示已选数量（如 "已选 1 款"）。

        - 主按钮：

            - 初始状态：置灰，文案“至少选择 3 款游戏”。

            - 达成状态（≥3款）：高亮，文案“进入我的专属首页”。

    - **跳过机制**：右上角提供“跳过”文本按钮，点击直接进入首页（不记录标签）。

- **数据逻辑**：

    - 用户提交后，系统获取选中游戏的关联标签（Tag）\-游戏归类标签。

    - 取频率最高的5个标签作为该用户的“初始兴趣Tag”。

        - 用户自己选择游戏的标签；标签频率最高=相同标签出现次数最多；如果无法取频率最高的标签（即每个标签就出现一次），随机5个标签

- **存储逻辑**：

    - **未登录存储：** 在用户未登录时，服务端保存兴趣标签选择至设备。

    1. **登录后：**如果登录后，将设备的兴趣通过登录接口发给绑定到账号下，作为登录账号的兴趣标签。

#### <span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3 两步个性化与来源问卷</span>

<span style="background-color: #FEF794;">本节规则优先级高于3\.2\.1旧版“单设备首次访问、右上角跳过后直接进首页、提交失败自动跳过”等冲突内容。旧版探索页、秒玩页和推荐算法规则不变。</span>

**触发规则：**

|<span style="background-color: #FEF794;">用户类型</span>|<span style="background-color: #FEF794;">触发时间</span>|<span style="background-color: #FEF794;">不触发场景</span>|
|---|---|---|
|<span style="background-color: #FEF794;">新用户</span>|<span style="background-color: #FEF794;">完成独立新手引流后记录完成时间；满滚动24小时后的首次合格冷启动展示，不在完成新手引流的当次启动叠加。</span>|<span style="background-color: #FEF794;">未满24小时、问卷已完成、未命中版本/市场/灰度或存在更高优先级流程。</span>|
|<span style="background-color: #FEF794;">非新用户</span>|<span style="background-color: #FEF794;">目标版本上线后的首次合格冷启动展示；有历史兴趣采集终态但无来源答案时直接进入第二步。</span>|<span style="background-color: #FEF794;">问卷已完成、未命中版本/市场/灰度或存在更高优先级流程。</span>|

<span style="background-color: #FEF794;">合格冷启动指App从未运行状态启动，且隐私协议、强制升级和安全合规流程已完成；当前不在新手引流、登录、授权、支付、下载、导入、Steam绑定或游戏恢复流程；没有更高优先级系统弹层。后台返回、支付返回、Deep Link、推送直达和游戏恢复不触发。优先级为：隐私/合规 ＞ 强制升级/安全 ＞ 新手引流 ＞ 两步问卷 ＞ 运营活动/广告。</span>

|<span style="background-color: #FEF794;">模块名称</span>|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">第一步：选择游戏</span>|![图3.2.1-1：选择感兴趣的游戏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/01-game-step-cn.png)|<span style="background-color: #FEF794;">① 两段进度点亮第一段，展示游戏封面、名称、类型和“换一批”。<br>② 至少选3款、最多9款；不足3款主按钮不可点击；选满9款后未选游戏不可继续选择。<br>③ 换一批只替换未选游戏，已选游戏保留；候选不足时循环补足，不重复展示同一游戏。<br>④ 点击“暂不选择”进入第二步，不生成手选兴趣标签；推荐继续使用行为数据或热度兜底。<br>⑤ 游戏列表加载失败时展示“重新加载”和“暂不选择”；提交失败保留草稿，允许重试或主动跳过，不能把技术失败记为用户跳过。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">第二步：来源采集</span>|![图3.2.1-2：国内来源采集](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/02-source-step-cn.png)<br>![图3.2.1-3：海外来源采集](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/03-source-step-overseas.png)|<span style="background-color: #FEF794;">① 两段进度全部点亮；国内包显示中文，海外包跟随App语言，品牌统一写GameHub。<br>② 固定为5个主要渠道＋1个“其他/不记得”，单选、必答、默认不选中；页面不提供关闭、跳过或稍后回答。<br>③ 未选择时完成按钮不可点击；选择后点击完成，本地可靠保存成功即可进入首页。<br>④ 系统返回键回到第一步；再次进入第二步保留来源选择。<br>⑤ 来源答案只用于渠道分析，不参与兴趣标签，不覆盖安装包、商店、广告平台、UTM或Deep Link等客观安装归因。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">中断恢复与离线完成</span>|![图3.2.1-4：第二步中断恢复与离线状态](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@8d57a53c8deb06f9cb11e45610c6328e727e915c/public/prd/personalization-acquisition-wizard/04-source-resume-offline.png)|<span style="background-color: #FEF794;">① 每次选择后保存当前步骤和草稿；进程终止或App崩溃后从原步骤恢复。第一步已完成或跳过时直接恢复第二步。<br>② 来源提交时无网络，先保存到本机并进入首页；联网后后台补报。<br>③ 首次点击完成后按钮进入处理中，重复点击只查询原结果，不生成第二份答案。<br>④ 同一账号或匿名设备完成后不再自动展示；首次有效来源答案不可被登录、换机、重装或运营改配置覆盖。</span>|

**国内/海外来源选项：**

|<span style="background-color: #FEF794;">市场</span>|<span style="background-color: #FEF794;">展示文案</span>|<span style="background-color: #FEF794;">稳定枚举</span>|
|---|---|---|
|<span style="background-color: #FEF794;">国内</span>|抖音|`douyin`|
|<span style="background-color: #FEF794;">国内</span>|哔哩哔哩|`bilibili`|
|<span style="background-color: #FEF794;">国内</span>|小红书|`xiaohongshu`|
|<span style="background-color: #FEF794;">国内</span>|应用商店|`app_store`|
|<span style="background-color: #FEF794;">国内</span>|朋友推荐|`friend_referral`|
|<span style="background-color: #FEF794;">国内</span>|其他／不记得|`other_or_unknown`|
|<span style="background-color: #FEF794;">海外</span>|YouTube|`youtube`|
|<span style="background-color: #FEF794;">海外</span>|TikTok|`tiktok`|
|<span style="background-color: #FEF794;">海外</span>|Reddit|`reddit`|
|<span style="background-color: #FEF794;">海外</span>|Discord|`discord`|
|<span style="background-color: #FEF794;">海外</span>|Friends|`friend_referral`|
|<span style="background-color: #FEF794;">海外</span>|Other / I don’t remember|`other_or_unknown`|

**状态与身份合并：**

|<span style="background-color: #FEF794;">场景</span>|<span style="background-color: #FEF794;">处理方式</span>|
|---|---|
|<span style="background-color: #FEF794;">业务状态</span>|<span style="background-color: #FEF794;">未满足条件 → 待触发 → 第一进行中 → 第一完成或跳过 → 第二待完成 → 已完成。只允许按该方向推进；返回上一步不撤销第二步待完成状态。</span>|
|<span style="background-color: #FEF794;">未登录</span>|<span style="background-color: #FEF794;">按安装标识和匿名设备保存草稿与终态，未登录也可完成。</span>|
|<span style="background-color: #FEF794;">首次登录</span>|<span style="background-color: #FEF794;">设备草稿迁移至账号；账号已有终态时账号优先，完成状态优先于进行中状态。</span>|
|<span style="background-color: #FEF794;">同账号多设备</span>|<span style="background-color: #FEF794;">其他设备完成后，当前设备下次查询终态时退出问卷；进行中的本地草稿不覆盖已完成账号。</span>|
|<span style="background-color: #FEF794;">同设备切换账号</span>|<span style="background-color: #FEF794;">登录后按当前账号独立判断，不继承其他账号的兴趣选择；未登录完成结果只在首次绑定时迁移一次。</span>|
|<span style="background-color: #FEF794;">选项版本变化</span>|<span style="background-color: #FEF794;">进行中的问卷继续使用首次曝光时的选项版本；新会话使用新版本；历史答案按原版本解释。</span>|

**运营配置能力（复用现有配置平台，不新增独立后台页面）：**

|<span style="background-color: #FEF794;">区域</span>|<span style="background-color: #FEF794;">展示\&交互说明</span>|
|---|---|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">筛选与列表</span>|<span style="background-color: #FEF794;">支持按市场、状态、目标用户、版本和生效时间筛选；条件之间为“且”。查询提交条件并回到第一页；重置清空条件、回到第一页并刷新。列表展示配置ID、市场、版本范围、目标用户、灰度比例、生效时间、选项版本、状态、操作人和操作时间；默认按操作时间倒序，每页20条。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">配置字段</span>|<span style="background-color: #FEF794;">总开关；国内/海外市场；最低/最高版本；新用户/非新用户；1\-100%灰度；开始/结束时间；5个主要渠道＋1个兜底项；选项顺序、图标和多语言文案。图标支持PNG/WebP、正方形、单张不超过200KB；加载失败显示平台首字母。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">新增、编辑与复制</span>|<span style="background-color: #FEF794;">支持新增、编辑、复制、启用和停用。草稿可删除；已生效配置只允许停用，不做硬删除。发布后的稳定枚举不可改为其他含义；调整选项集合或含义时生成新选项版本。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">保存与冲突</span>|<span style="background-color: #FEF794;">保存时校验市场、版本、目标用户、灰度、生效时间和6个来源项；提交期间按钮不可重复点击。并发保存只接受基于最新配置版本的请求；冲突提示“配置已更新，请刷新后重试”。失败或超时继续使用上一有效配置。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">权限与审计</span>|<span style="background-color: #FEF794;">产品管理员和指定运营可新增、编辑、复制、启停；数据分析和客服只读。每次保存记录操作人、时间、修改前后、配置版本和请求标识。</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">客户端降级</span>|<span style="background-color: #FEF794;">远程配置失败时使用包内默认6项或最近一次完整缓存；总开关、版本、市场和灰度无法可靠判断时本次不展示，不影响原首页。</span>|

### 3\.2\.2 探索页改造

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzhkYWQ1M2E4NTI1YzhjY2U2MWVmYjlkYjY0NzU1ZWJfOTk0OTYxMGFkMDZiZDA4NWFlMDhmMDNlZjc4MWM0MjFfSUQ6NzYwNTgwNzMyODY3NTc2MTA4Ml8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjUxNDRkOTVkNTg3M2E0Y2JlNmEzN2ViYmQyYWNjM2VfOGMzZjg5YTIwZjU4MDUxMTk3MmZiMjBmNDBkNTRmYTZfSUQ6NzYwNTg2MzI4Mzk0NTU1NzIwNV8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWM0ODI1MDQxODAwMzI5YjY2ZmU3MzZlNjIxOTBmNGRfMDM0NTU0MzlmMzRlNTA3NTRmMjRjMTdlOTZlNmNjMjdfSUQ6NzYwNTg2MzMxOTE5ODc5NjczOV8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

|**模块**|**原方案**|**新方案 **|**数据/排序逻辑**|
|---|---|---|---|
|**热门推荐**|热门推荐 \(人工\)<br>|**为你推荐 **<br>|已选用户兴趣标签：采用ai推荐池的策略取12款游戏，具体见 3\.2\.4<br>未选兴趣标签：采用兜底策略，见3\.2\.4 C**兜底逻辑**<br>移除缓存逻辑，一次性提供500个游戏，超量时循环展示//2026\.4\.8修改|
|**复古专区**<br>|复古游戏 \(人工\)<br>|**复古游戏 **|规则排序<br>筛选 tag="Retro" 的游戏，按 全站近7天游玩时长 降序排列。<br>限制最多游戏数量12个//2026\.3\.23修改|
|**核心列表区**|全部游戏 \(前10位插入4位推荐位\)|**猜你喜欢**<br>|已选用户兴趣标签：采用ai推荐池的策略，具体见 3\.2\.4<br>未选兴趣标签：采用兜底策略，见3\.2\.4 B**兜底逻辑**<br>移除缓存逻辑，一次性提供500个游戏，超量时循环展示//2026\.4\.8修改|

### 3\.2\.3 秒玩页 改造

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTBiMDZmMGQyZDgzMGQ1Njk0MGY2MmNjMzQwYzY2MzBfYzMzNDlhZjEyZGM5Y2MzN2JlYzU2ZDQ5Y2NmMWViNDlfSUQ6NzYwNTgwNzI5MDAxNDQzNjU1NV8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTg4NTRmNDk2OGYzNGVhZDgxOTcwOTU2YTdiYzM5ZWFfNzQ2ZTgzNzRhNDg4OWFmYmI3YzIyYjAzODMwMTc5N2NfSUQ6NzYwNTg2MzIxMDIxODQ1ODMxMl8xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)

|**模块**|**原方案**|**新方案**|**数据/排序逻辑**|
|---|---|---|---|
|**PC游戏 Tab**|分类游戏 \(人工\)|**分类排行**<br>|规则排序<br>动作/RPG/射击等各子分类下，均按 全站近7天游玩时长 降序展示。<br>限制每个分类最多游戏数量12个//2026\.3\.23修改<br>移除缓存逻辑，一次性提供500个游戏，超量时循环展示//2026\.4\.8修改|
|**PC云游戏（秒玩） Tab**|全部游戏 \(前10位插入4个推荐位\)|**猜你喜欢 **|**限制支持秒玩的游戏**<br>已选用户兴趣标签：采用ai推荐池的策略，具体见 3\.2\.4<br>未选兴趣标签：采用兜底策略，见3\.2\.4 B**兜底逻辑**|

### 3\.2\.4 核心算法逻辑：

#### A\. ai推荐池逻辑

根据优先级依次获取用户兴趣标签提供给ai生成推荐池

- **优先级1：**根据用户选择的兴趣标签生成推荐池循环填充，且评分≥8\.0分，评价人数≥10人

- **优先级2：**根据游戏库游戏，最近游玩的1\-3个游戏类型作为兴趣标签生成推荐池循环填充，且评分≥8\.0分，评价人数≥10人

- **模型唯一追求指标：**曝光\-\>游戏启动转化率

#### **B\. 兜底逻辑 **

- **场景**：冷启动“跳过”处理策略或游戏库无游戏

- **逻辑**：依次填充“全站热度池\(池A\)”、“潜力池\(池B\)”、“高分池\(池C\)”的顺序循环填充

- **打散**：任意连续3款游戏不可属于同一一级分类（如不能连续3个全是角色扮演）。



### 3\.2\.5 动态修正机制 \(实时兴趣\)

- 只要用户在后续产生 **有效游戏行为**（包含进入游戏详情、秒玩或PC启动游戏），系统需立即捕获该行为对应的游戏标签生成推荐池。

- **响应速度**：下次下拉刷新或访问列表时，推荐池即刻切换为 **\[基于行为的推荐\]**

### 3\.2\.6 业务规则限制

- **打散**：探索页、玩游戏\-PC游戏、玩游戏\-PC云游戏（秒玩）tab的游戏，曝光过，则不再重复出现

    - 仅对应tab去重，如探索页tab，玩游戏\-PC云游戏（秒玩）tab，2个tab间无需去重//2026\.4\.8修改

- **过滤**：必须剔除用户\[已安装\]、\[已入库\]的游戏。

    - 已安装\+已入库各限制10个，按照最近游玩时间各前10个计算/2046\.4\.8修改

- **去重**：同一游戏在列表中仅出现一次。



### 3\.2\.7 其他

**ai生成模型参考：**

- **神经网络模型**：用 **RecBole（****https://github\.com/RUCAIBox/RecBole****）**，直接跑一下 **SASRec** 算法（用自带的 Steam 数据集）。

- **深度学习召回算法**：用 **DeepMatch** （https://github\.com/shenweichen/DeepMatch）。

**可能涉及的数据：**

- User\_ID, Game\_ID, Timestamp \(游玩时间\)，Action \(点击/下载/游玩时长\)。



# 四、 非功能需求

> 可以列举产品营销需求、运营需求、财务需求、法务需求、使用帮助、问题反馈
>
>

|**分类**|**需求项**|**详细指标与说明**|
|---|---|---|
|**1\. 性能指标**|**接口响应时间**|● **列表加载接口**（探索页/秒玩页）：TP99 ≤ **200ms**（含推荐计算耗时）。<br>● **兴趣提交接口**（冷启动）：TP99 ≤ **500ms**（含画像生成）。|
||**并发能力**|● 推荐微服务需支持 **10,000 QPS** 并发，高峰期支持自动扩容。|
||**客户端流畅度**<br>|● 列表滑动帧率（FPS）保持在 **55 FPS** 以上，卡片加载无明显白屏/闪烁。<br>|
|**2\. 数据时效**|**静态池更新**|● 热度池\(A\)/潜力池\(B\)/口碑池\(C\) 需在每日 完成 T\+1 更新。|
||**实时画像修正**|● **跳过用户**产生有效行为（点击/启动）后，画像需在 **秒级** 内更新。<br>● 用户**下一次下拉刷新**时，必须刷出基于该行为的推荐内容（结束兜底）。|
|**3\. 稳定性**|**熔断与降级**|● 若推荐算法服务超时（\>500ms）或不可用，系统需自动降级为 **\[兜底策略\]**。<br>● 降级时前端无感知，但埋点 `strategy_id` 需上报为 `system_fallback`。|
||**冷启动容错**|● 若兴趣采集页提交失败（网络/服务异常），自动执行“跳过”逻辑，进入首页展示热度兜底。|
||<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3问卷容错</span>|<span style="background-color: #FEF794;">● 本行覆盖上一行冲突规则：第一步提交失败保留选择并允许重试或主动跳过，不自动记为用户跳过。<br>● 第二步来源在本地可靠保存后即可进入首页，服务端同步失败后台重试。<br>● 来源配置加载失败时使用包内默认6项或最近一次完整缓存。</span>|
|**4\. 数据一致性**<br>|**曝光去重**|● 同一次下拉刷新（Request ID相同）内，同一游戏ID在客户端 **只上报一次** 曝光，避免CTR分母虚高。|
||<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">问卷状态</span>|<span style="background-color: #FEF794;">● 来源首次有效答案不可覆盖；账号终态优先于设备进行中草稿。<br>● 客户端横竖屏切换保留步骤、选择和滚动位置。<br>● 重复提交按同一请求处理，不生成重复答案。</span>|
|<span style="background-color: #FEF794;">5\. 兼容性与多语言</span>|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">国内/海外</span>|<span style="background-color: #FEF794;">● 国内包显示中文；海外包跟随App语言并使用GameHub。<br>● Android、iOS均支持竖屏和横屏，系统安全区内无遮挡。</span>|

# 五、埋点需求

## 5\.1 埋点事件表

|**事件ID**|**事件名称**|**触发时机**|**关键业务参数 \(Params\)**|
|---|---|---|---|
|**`cold_start_action`**|冷启动页操作<br>|在兴趣采集页点击“进入首页”或“跳过”时触发<br>|``**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，action_type`,`selected_count`,`duration`，**game\_type**<br>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_wizard_view`</span>|<span style="background-color: #FEF794;">问卷步骤曝光</span>|<span style="background-color: #FEF794;">任一步完整展示</span>|<span style="background-color: #FEF794;">`step`,`market`,`question_version`,`entry_group`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_game_select`</span>|<span style="background-color: #FEF794;">游戏选择</span>|<span style="background-color: #FEF794;">选择或取消一款游戏</span>|<span style="background-color: #FEF794;">`game_id`,`selected_count`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_game_submit`</span>|<span style="background-color: #FEF794;">第一步提交</span>|<span style="background-color: #FEF794;">第一步成功提交3\-9款游戏</span>|<span style="background-color: #FEF794;">`selected_ids`,`selected_count`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_game_skip`</span>|<span style="background-color: #FEF794;">第一步跳过</span>|<span style="background-color: #FEF794;">点击“暂不选择”</span>|<span style="background-color: #FEF794;">`duration_ms`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`acquisition_source_select`</span>|<span style="background-color: #FEF794;">来源选择</span>|<span style="background-color: #FEF794;">选择或切换来源</span>|<span style="background-color: #FEF794;">`source_code`,`option_position`,`option_version`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`acquisition_source_submit`</span>|<span style="background-color: #FEF794;">来源完成</span>|<span style="background-color: #FEF794;">来源在本地可靠保存</span>|<span style="background-color: #FEF794;">`source_code`,`market`,`package_channel`,`option_version`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_wizard_interrupt`</span>|<span style="background-color: #FEF794;">问卷中断</span>|<span style="background-color: #FEF794;">退出、强杀恢复或异常中断</span>|<span style="background-color: #FEF794;">`step`,`interrupt_type`</span>|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`personalization_wizard_sync_result`</span>|<span style="background-color: #FEF794;">补报结果</span>|<span style="background-color: #FEF794;">后台同步成功或失败</span>|<span style="background-color: #FEF794;">`result`,`retry_count`</span>|
|**`module_view`**|推荐模块曝光|列表/模块加载成功且展示在视区时<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，module_name`,`request_id`，**game\_type**|
|**`card_show`**|卡片曝光|游戏卡片进入屏幕可视区域 \> 50%<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，game_id`,`strategy_id`,`position_index`，**game\_type**|
|**`card_click`**|卡片点击|点击游戏卡片进入详情页时<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，game_id`,`strategy_id`,`position_index`，**game\_type**|
|**`game_start_click`**|启动游戏|在详情页点击“秒玩/启动”按钮时<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，game_id`,`ref_strategy_id`,`button_type`，**game\_type**|
|**game\_detail\_view**|**详情页浏览**|进入游戏详情页<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，`game\_id,source\_module,ref\_strategy，**game\_type**|
|**game\_start\_click**|**启动游戏**|点击“秒玩/启动/下载”按钮<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，`game\_id,button\_type，source\_module,ref\_strategy，**game\_type**|
|**play\_heartbeat**|**游戏心跳**|游戏启动后每分钟上报一次<br>|**`uid`**` ， `**`action_type`**` ， device_id ， app_version ， network ， ab_test_group ，`game\_id,duration，**game\_type**|



## 5\.2 埋点参数表

|**参数名**|**类型**|**是否必填**|**说明**|**示例值**|
|---|---|---|---|---|
|**`uid`**|string|**是**|用户唯一标识（未登录传设备ID）|`8839102`|
|**`action_type`**|string|**是**|用户交互类型（仅用于冷启动事件）|`submit`, `skip`|
|`device_id`|String|**是**|设备唯一标识|"D\_X86\_001"|
|`app_version`|String|**是**|App版本号|"8\.2\.0"|
|`network`|String|**是**|网络环境|"WIFI", "5G", "4G", "3G", "2G"|
|`ab_test_group`|String|**是**|实验分组 \(用于算法A/B测试\)，区别ai推荐池、池a、池b、池c|"ai"、"a"、“b”、“c”|
|**`selected_count`**|int|否|用户选中的游戏数量（跳过时为0）|`3`|
|**`selected_ids`**|string|否|用户选中的游戏ID集合（逗号分隔）|`1001,1002,1045`|
|**`module_name`**|string|**是**|当前所在的功能模块名称|`explorer_guess_like`|
|**`request_id`**|string|**是**|推荐接口返回的唯一请求ID（用于关联曝光和点击，排查算法问题）|`req_20260212_ab3f`|
|**`game_id`**|string|**是**|游戏唯一ID|`2048`|
|**`game_name`**|string|是|游戏名称（方便分析师直接看）|`黑神话：悟空`|
|**`game_type`**|string|是|游戏类型<br>|`pc_game`, `mobile_game`, `steam_game`, `imported_game`，`Retro_games`|
|**`strategy_id`**|string|**是**|**推荐策略来源**（核心归因字段，区分算法/规则/兜底）|`algo_user_cf`, `rule_hot_pool`|
|**`ref_strategy_id`**|string|否|**来源策略透传**（用于转化事件，透传上一页的strategy\_id）|`algo_user_cf`|
|**`position_index`**|int|**是**|列表中的绝对位置索引（从0开始）|`5`|
|**`is_new_user`**|boolean|**是**|是否为首日注册的新用户（用于区分冷启动效果）|`true`, `false`|
|**`button_type`**|string|否|启动按钮类型|`cloud_play`, `download`|
|**`duration`**|int|否|页面停留时长（毫秒）|`4500`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`step`</span>|string|是|<span style="background-color: #FEF794;">问卷步骤</span>|`game`,`source`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`market`</span>|string|是|<span style="background-color: #FEF794;">市场</span>|`domestic`,`overseas`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`entry_group`</span>|string|是|<span style="background-color: #FEF794;">触发人群</span>|`new_user`,`existing_user`,`source_resume`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`source_code`</span>|string|否|<span style="background-color: #FEF794;">来源稳定枚举</span>|`douyin`,`youtube`,`friend_referral`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`option_version`</span>|string|否|<span style="background-color: #FEF794;">来源选项版本</span>|`domestic_v1`,`overseas_v1`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`package_channel`</span>|string|否|<span style="background-color: #FEF794;">客观包体渠道，只用于交叉分析，不被来源答案覆盖</span>|`official`,`GooglePlay`,`vivo`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`interrupt_type`</span>|string|否|<span style="background-color: #FEF794;">中断类型</span>|`app_close`,`process_kill`,`crash`,`system_back`|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">`retry_count`</span>|int|否|<span style="background-color: #FEF794;">后台补报次数</span>|`0`,`1`,`2`|





# 六、 验收标准

|**模块**|**测试场景 \(Case\)**|**预期结果 \(Expected Result\)**|
|---|---|---|
|**1\. 冷启动**|**1: 正常提交标签**<br>|● 首页“猜你喜欢”列表第 2,4,6,7 位展示 MOBA/RPG/射击类游戏。<br>● 埋点 cold\_start\_action 上报 action\_type=submit。|
||**2: 跳过 \(兜底策略\)**|● 列表展示全站热度榜游戏（兜底）。<br>● 列表顺序需随机打散（多次测试跳过，前10位不完全一致）。<br>● 埋点 cold\_start\_action 上报 action\_type=skip。|
||**3: 跳过后的修正**|● 刷新后的推荐位（Slot 2,4\.\.\.）需出现其他“赛车类”游戏。<br>● 埋点 strategy\_id 由 rule\_fallback\_hot 变为 algo\_item\_cf。|
|<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3两步问卷</span>|<span style="background-color: #FEF794;">AC\-01 新用户当日不叠加</span>|<span style="background-color: #FEF794;">完成新手引流的当次启动和未满滚动24小时的冷启动均不展示问卷。</span>|
||<span style="background-color: #FEF794;">AC\-02 滚动24小时触发</span>|<span style="background-color: #FEF794;">满24小时后不主动唤起；下一次合格冷启动展示，非自然日零点口径。</span>|
||<span style="background-color: #FEF794;">AC\-03 游戏选择限制</span>|<span style="background-color: #FEF794;">不足3款不能提交，最多9款；换一批保留已选游戏。</span>|
||<span style="background-color: #FEF794;">AC\-04 游戏跳过</span>|<span style="background-color: #FEF794;">点击“暂不选择”进入第二步，手选兴趣标签为空，推荐使用行为或热度兜底。</span>|
||<span style="background-color: #FEF794;">AC\-05 来源必答</span>|<span style="background-color: #FEF794;">来源单选、必答、不可跳过；默认不选中，未选择不能完成。</span>|
||<span style="background-color: #FEF794;">AC\-06 国内/海外</span>|<span style="background-color: #FEF794;">国内和海外分别展示正确6项；海外品牌为GameHub，不出现GaishiGame。</span>|
||<span style="background-color: #FEF794;">AC\-07 中断恢复</span>|<span style="background-color: #FEF794;">第一步完成后在第二步中断，下次合格冷启动直接恢复第二步并保留来源草稿。</span>|
||<span style="background-color: #FEF794;">AC\-08 离线完成</span>|<span style="background-color: #FEF794;">断网时来源答案本地可靠保存并进入首页；联网后补报成功，不重复展示。</span>|
||<span style="background-color: #FEF794;">AC\-09 身份去重</span>|<span style="background-color: #FEF794;">账号终态优先于设备草稿；同账号其他设备完成后当前设备不重复展示；首次答案不覆盖。</span>|
||<span style="background-color: #FEF794;">AC\-10 横竖屏</span>|<span style="background-color: #FEF794;">切换方向后步骤、游戏选择、来源选择和滚动位置保持不变，无裁切或遮挡。</span>|
||<span style="background-color: #FEF794;">AC\-11 数据隔离</span>|<span style="background-color: #FEF794;">来源不进入兴趣标签，不覆盖客观安装归因；报表可与包体、商店和广告归因交叉分析。</span>|
|**2\. 混合排序**|**4: 结构验证**|● 兜底策略：必须是热度/潜力/口碑池 Top1。<br>● ai推荐池：必须是算法推荐内容。|
||**5: 过滤已安装/已入库**|● 已安装的《黑神话：悟空》绝对不可出现在推荐位。|
||**6: 分类避让**|● 列表中 不可连续出现 3 个 射击游戏。<br>● 第 3 个射击游戏应被顺延至后续位置。|
|**3\. 埋点透传**|**7: 策略ID全链路**|● card\_show 中 strategy\_id = algo\_xxx。<br>● card\_click 中 strategy\_id = algo\_xxx。● game\_start\_click 中 ref\_strategy\_id = algo\_xxx。<br>● 三者必须完全一致。|
|**4\. 其他模块**|**8: 秒玩分类排序**|● 列表严格按照 全站近7天游玩时长 降序排列（对比后端SQL数据）。|



# 七、 美术需求

|**序号**|**页面/模块**|**关键文案/状态**|**说明**|**图示**|
|---|---|---|---|---|
|1|兴趣采集页|“定制你的专属首页” / “挑选你感兴趣的游戏，让推荐更懂你”。<br>|设计专门的设计采集业，并展示9宫格游戏列表|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTE0ZGJjMGIyNjM3YmNmZGI3YTk3MGM1NGY1NDNhMTBfZTQ2MDlkNmY3MzZlODc0OTRmZTNkMGQyNzFlNjg5YTdfSUQ6NzYwNTg5MjA4NjQ1MDgxNzk5M18xNzgyNzkxNzk3OjE3ODI4NzgxOTdfVjM)<br>|

# 八、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">V1\.3上线验证</span>

- <span style="background-color: #FEF794;">国内、海外分别从5%稳定灰度开始；新用户和非新用户分开观察。</span>
- <span style="background-color: #FEF794;">核心指标：第一步提交率、跳过率、平均选择数；第二步完成率、退出率、“其他/不记得”占比；问卷曝光后的App退出率；本地保存成功率、补报成功率、重复触发率。</span>
- <span style="background-color: #FEF794;">来源为用户自报数据，只用于渠道分析。分析来源用户的后续启动和留存时，必须与客观安装归因分栏展示。</span>
- <span style="background-color: #FEF794;">若第二步退出率明显高于第一步，或“其他/不记得”占比异常升高，先检查强制回答和选项覆盖，不直接把答案解释为真实渠道分布。</span>

# 九、<span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">自检记录</span>

|<span style="background-color: #FEF794;">检查项</span>|<span style="background-color: #FEF794;">结论</span>|<span style="background-color: #FEF794;">对应位置</span>|
|---|---|---|
|<span style="background-color: #FEF794;">端侧与市场</span>|<span style="background-color: #FEF794;">C端＋运营配置能力；国内＋海外。海外统一使用GameHub。</span>|<span style="background-color: #FEF794;">3\.2\.1 V1\.3</span>|
|<span style="background-color: #FEF794;">选择与表单</span>|<span style="background-color: #FEF794;">已写3\-9款、来源默认空、单选必答、校验时机、重复提交和草稿保存。</span>|<span style="background-color: #FEF794;">3\.2\.1 V1\.3</span>|
|<span style="background-color: #FEF794;">状态与身份</span>|<span style="background-color: #FEF794;">已写状态流转、游客/登录、多设备、账号切换和首次答案保护。</span>|<span style="background-color: #FEF794;">3\.2\.1“状态与身份合并”</span>|
|<span style="background-color: #FEF794;">异常与边界</span>|<span style="background-color: #FEF794;">已写加载失败、提交失败、断网、进程中断、配置失败、并发保存和幂等补报。</span>|<span style="background-color: #FEF794;">3\.2\.1、四、六</span>|
|<span style="background-color: #FEF794;">后台增删查改</span>|<span style="background-color: #FEF794;">已写筛选、列表、分页、新增、编辑、复制、启停、草稿删除、权限和操作日志。</span>|<span style="background-color: #FEF794;">3\.2\.1“运营配置能力”</span>|
|<span style="background-color: #FEF794;">灰度与指标</span>|<span style="background-color: #FEF794;">已写5%稳定灰度、核心漏斗、退出率、补报成功率和数据解释边界。</span>|<span style="background-color: #FEF794;">八</span>|
|<span style="background-color: #FEF794;">图示</span>|<span style="background-color: #FEF794;">4张V1\.3图示均在3\.2\.1表格“图示”列，使用固定提交8d57a53c8deb06f9cb11e45610c6328e727e915c。</span>|<span style="background-color: #FEF794;">3\.2\.1 V1\.3</span>|

**模拟评审结果：**

|角色|结论|发现的问题|
|---|---|---|
|前端开发|✓|触发优先级、两步交互、状态恢复、身份合并和配置降级均有明确规则。|
|测试工程师|✓|已覆盖弱网、中断、重复提交、跨设备、横竖屏、选项版本和极端选择数。|
|运营/业务方|✓|已明确国内海外6项、配置字段、灰度、权限、版本和数据解释边界。|
