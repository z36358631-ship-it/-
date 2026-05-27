# 【Prd】《盖世游戏》社区首页需求

# 一、 版本信息

|**时间**|**版本**|**变更人**|**主要变更内容**|**备注**|
|---|---|---|---|---|
|2026\.3\.23|V1\.0|郑群超|创建文档||
|2026\.05\.25|V2\.0|郑群超|导航改版+游戏圈重构+求助/攻略分类+置顶区|基于CTO会议结论|
|2026\.05\.27|V2\.1|郑群超|内容发布改版+黑名单管理+发帖风控（手机号绑定+防刷屏）|冷启动运营+合规要求|

# 二、 背景与目标

**背景：**
目前《盖世游戏》APP的工具属性与分发属性较强，但社区讨论与游戏详情页呈割裂状态，用户获取攻略、分享游戏配置的路径过长。当前APP的**平均用户停留时长停滞在 12 分钟左右**。
此外，新社区上线会处于冷启动阶段，需要有效的激励机制来承载和刺激用户的活跃行为（UGC产出、互动留存）形成高粘性的玩家圈层。

**目标：**

本次旨在APP内构建\*\*“深度内容讨论 \+ 虚拟经济激励”\*\*的双引擎驱动生态：

1. **场景深度融合：** 打通游戏详情与社区圈子，重构横竖屏自适应布局（引入横屏50:50双栏），让“看贴\-找攻略\-游玩”无缝衔接。

2. **建立活跃激励闭环：** 引入“盖世币”经济系统，通过任务中心（获取）与兑换商城（消耗），打造良性的促活闭环。
**核心挑战：** 横海量UGC内容的后台安全治理与层级弹窗（Z\-index）的内存管理。

# 三、 故事介绍

在切入繁杂的功能点前，我们先通过两个典型用户的视角，来看看新社区全貌的运转方式。

## 3\.1 用户与运营场景

**用户与运营场景：**

- **C端创作者（张三 \- 达人玩家）：** 张三在玩《黑神话：悟空》时卡关了，他在APP横屏模式下左边看着游戏卡片，右边刷着社区攻略。顺利通关后，他点击右下角 `\+` 号发布动态，不仅带上了 `\#黑神话攻略` 话题，还一键导入了自己的“手柄按键配置方案”。发布成功后，系统提示他完成了每日发帖任务，**盖世币 \+20**。他随即进入“兑换商城”，用积攒的盖世币兑换了一个实体手柄。

- **B端运营（李四）：** 李四在后台看到用户举报张三的帖子里有违规评论。他通过【举报管理】查实后，一键对该评论执行了“静默处理（仅作者可见）”。为了激励优质内容，李四给张三的账号下发了“硬核高玩”的专属身份标签，并把该帖子【置顶】到分区。

## 3\.2 价值分析

当我们在社区内实现游戏直接售卖后，理论上可以显著提升流量变现效率：

**价值分析**

- **突破停留时长瓶颈：** 过去用户“下完游戏、玩完就走”，现在通过引入“签到、浏览3分钟、互动”等盖世币任务，辅以丰富的图文视频信息流，**期望将APP平均停留时长从 12 分钟大幅拉升至 20 分钟以上。**

- **沉淀社交与资产壁垒：** 社区不再是单纯的灌水区，而是融合了“Steam/Epic资产外显”、“外设启动配置一键分享”的硬核玩家名片。这种独有的工具\+社交属性将极大提高用户的迁移成本。

## 3\.3 核心体验路径

我们首先明确核心用户的核心体验漏斗路径：

**内容消费者\&amp;发布者\&amp;生态治理核心链路：**

- **C端“内容消费与变现”链路：**
进入探索页/搜索（触发 16:9 自适应横图） \-\&gt; 浏览分区 Feed 流 \-\&gt; 沉浸式阅读动态详情（点赞/评论/收藏/关注） \-\&gt; 触发盖世币奖励 Toast \-\&gt; 进入任务中心（查看余额） \-\&gt; 兑换商城挑选商品 \-\&gt; 填写地址/自动发货 \-\&gt; 订单履约与消息通知闭环。

- **C端“内容创作”链路：**
点击 FAB 悬浮发帖 \-\&gt; 插入富文本/话题/多媒体 \-\&gt; 挂载“游戏卡片”与“配置方案” \-\&gt; 发布 \-\&gt; 审核过滤 \-\&gt; 动态流分发。

- **B端“生态治理”链路：**
新增/编辑分区 \-\&gt; 身份标签赋权 \-\&gt; 接收前端违规举报工单 \-\&gt; 帖子判定（删除/静默/置顶/加精） \-\&gt; 奖品库存维护与物流单号录入。

## 3\.4 产品指标预测

为项目上线后的快速复盘制定数据基线：

**产品指标预测：**

1. **大盘活跃度（APP时长）：** 平均停留时长由 12min 提升至 **20min\+**。

2. **互动渗透率：** 社区曝光 UV 到产生互动（点赞/评论/发布）的转化率，首月预测为 `15%` 左右。

3. **任务与商城漏斗：** 每日活跃用户中，领取代币任务的比例预测达 `40%`；商城兑换收银台拉起 \-\&gt; 兑换成功率预测达 `95%`。

4. **内容安全：** 依赖后台的机审\+人审流转，违规内容处理率预测达 `100%`

## 3\.5 路径规划

基于敏捷开发（Sprint）原则，我们拆分了迭代节奏：

- **当前版本（V1\.0）：** 跑通底层架构。实现详情页与社区横竖屏融合、个人主页重构、发帖与配置分享闭环、盖世币任务商城（实物\+虚拟发货）、后台社区审核与发货中台。

- **未来可能升级（预告）：** 创作者现金分成计划、私信互动、更丰富的虚拟装扮（头像框、主页背景）、社区成长\&amp;成就体系、动态权限设置、删除评论、评论权限（开/关）。



# 四、概要设计

通过前面的背景介绍，相信大家对新功能的价值已具备体感，接下来转为研发视角的模块拆解。

## 4\.1 模块设计（系统架构图概览）

本次功能涉及的系统模块归纳如下，避免设计时大方向遗漏：

- **【C端 \- 内容与分发模块】**

    - 首页动态：单/双列布局切换、分区导航（Tab管理）、多媒体瀑布流。

    - 详情与搜索：50:50 横屏双栏融合、全局搜索重构、话题聚合页。

- **【C端 \- 互动与个人中心模块】**

    - 发帖器：多图/视频上传、富文本话题、关联游戏/配置方案、草稿箱。

    - Profile：主/客态面板、层级滑动、关注/粉丝列表、多平台资产外显。

    - 消息中心：点赞/评论/关注/系统消息分类、二级嵌套评论区。

- **【C端 \- 盖世币经济模块】**

    - 任务中心：日常/成长任务状态机、金币流水明细。

    - 兑换商城：商品瀑布流、实物商品收货地址闭环、虚拟商品直发。

- **【B端 \- 社区中台管理模块】**

    - 内容治理：举报工单流转、动态风控审核（通过/静默/违规/删除）。

    - 生态运营：游戏分区管理、KOL身份标签下发、商品库存与发货录入。

    |    **其余模块**|    文档链接|
    |---|---|
    |    **C端\-游戏详情页模块**|    [【Prd】《盖世游戏》社区游戏详情页改动需求](https://gamesirworld.feishu.cn/wiki/PK0xwE6LLi44nakzXd7cTQAOnOq?from=from_parent_docs)|
    |    **C端 \- 个人中心模块**|    [【Prd】《盖世游戏》社区我的页改动需求](https://gamesirworld.feishu.cn/wiki/MRB2wxI3eidhqvkExO0cEhhynzh)|
    |    **C端 \- 盖世币经济模块**|    [【Prd】《盖世游戏》社区任务中心\&amp;兑换商城需求](https://gamesirworld.feishu.cn/wiki/LpGEwvh3zidUMzkFf90czlIsnEh)|

## 4\.2 功能清单结构 



## 4\.3 详细设计

### 4\.3\.1 核心内容发布页面（C端）

功能demo：[社区首页demo](https://gistcdn.githack.com/z36358631-ship-it/230d3275582eee2774dc65d52e732713/raw/749decdda00e4b543ddd608c7f073081973ae896/%E7%A4%BE%E5%8C%BA%E9%A6%96%E9%A1%B5demo.html) 

|**模块名称**|**图示**|**展示\&amp;交互说明**|
|---|---|---|
|**首页：分区与动态流**|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Y2NiZDVmOWE5YzU1M2E1YzZjMDJhYmFhMzhhMzIwYjdfY2VkZWRhZmQzZGVjMzU5Y2RjY2Y0MTVjZjYyNGU3MWJfSUQ6NzYyMzk5NjI0NTk5MjM0NDc2NV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGIzNjk5ZjI2ZjNmOTEzMjUwMTg0Y2UyNGYyNjUwOTRfZjIzZWRlNWQzMTMwMmIzNWJmNzQ0ODBlMTY0NDNjMmJfSUQ6NzYyMzk5NjI4NDc2NDU4OTAwNV8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>|- **布局（推文风格）规范**：均展示为单列，且其UI元素具备严格规范：<br>    - **单列头部**：极简显示。左侧为发布人头像；右侧分两行（第一行为**加粗昵称**，第二行为**发布时间 · IP归属地**），统一在右侧最边缘增加 **“更多（···）”** 胶囊/图标按钮。<br>- **单列内容**：标题（最多2行，超过\.\.\.）、正文（最多5行，超过\.\.\.），文字在上，图片/视频在下。包含的话题（\#标签）需高亮展示。<br>    - **置顶标签：**后台进行了置顶的动态，在分区下标题前显示“置顶”标签<br>- **单列底栏（四大金刚键）**：底部操作栏严格且仅包含4个功能按钮，顺序依次为：**点赞、收藏、回复（评论）、转发**，等距横向排布。<br>    - **交互说明：**点击点赞/收藏则直接toast提示“点赞/收藏成功”，数字\+1<br>        - 点击回复跳转动态详情并自动定位至评论区<br>        - 点击转发则拉起转发动态页<br>- **审核中间态**：若媒体处于`pending`（审核中），展示深灰色占位块与漏斗图标；若处于`failed`（审核违规），展示深红色占位块与禁止图标。<br>- **空状态（缺省页）**：当前分区无内容时，居中展示线性SVG插画及文案“当前分区暂无动态”。<br>- **排序推荐规则：**<br>    - **按照热度分降序排列：**<br>        - **计算因子：**点赞数（正向权重）、收藏数（正向权重）、回复数（二级评论数量，含回复的回复，按总条数累计）、发布时间（新评论获得一定初始曝光，时间衰减因子）<br>        - **计算公式：热度分 = **\(动态点赞数 \* a \+动态收藏数 \* b \+ 动态回复数 \*c \) \* 时间衰减因子 \*分区系数<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTkwMTNjNjQ0ZmI0ZWIzYWU0N2QxNDE2NmI1MWMxYzVfN2IxZGQ1NTBhNjZiMDU3ODdlMTg2NzgyMDQ0NzkwYTNfSUQ6NzYyNDAwNTEwMDkwNjEyMjIwNF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>    - **最新作品强插排序：**每10个作品中，找出当前时间最新的N条作品（N=3），确保它们出现在前2\-10位（随机不相邻的3位，比如第M = 2、5、7位）|
|**“更多···”按钮**<br>|<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDVkMmZlNzYxYWQzODIwOWRkYzNjN2M1YjA2NzliM2RfYTgzNGRhMDFkNTcxNzA4YWE0NzY0NDMwNWVmNzA4YjRfSUQ6NzYyMzk5NzAyMjQ2MjgyMzM4NF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmU5Y2Q4ZjVmYWExZGEwMGNmMzk2MzZhYTQxOTQxODFfMGIyZmI4MTI1MmU2NTdjZTMyNWUyZWMyYTM4ZDMwZGNfSUQ6NzYyMzk5NzA0NzQyNzE4OTY5MV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWUxMmFmNjIwOGVkY2U2OTM1MDYxNWEzODg2MjRiMjdfZWE3N2M3YTYzZjQyMmFkYjYwM2ZiZjhhMmU1YWEwMmNfSUQ6NzYyMzk5NzExMjI3MTM1ODkyNF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|- 点击**“更多（···）”**弹出气泡操作菜单（点击页面空白处收起），包含两项操作：<br>    - **【不感兴趣】**：<br>        - **交互逻辑**：点击后气泡菜单收起，系统**立刻在当前列表移除该条动态卡片**（前端本地 DOM 移除补位），同时屏幕底部弹出 Toast 提示：“`操作成功，系统将减少为您推荐此类内容`”。<br>    - **【举报内容】**：<br>        - **交互逻辑**：点击后气泡菜单收起，从底部拉起半屏/居中的【举报动态】填写弹窗。<br>        **【举报动态弹窗 \(Report Modal\)】**<br>        - **弹窗样式**：采用底部向上滑出的圆角模态面板，带有半透明黑色全局背景遮罩。<br>        - **页面构成与表单规则**：<br>            - **动态标题**：顶部标题需动态读取当前被举报作者的昵称，格式拼接为：“`举报 @\[作者昵称\] 的动态`”。<br>            - **举报原因分类（必选单选）**：<br>                - 采用 4列 x 2行 的网格标签（Tag）平铺展示。<br>                - 选项包含：`社区无关`、`色情低俗`、`辱骂/引战`、`盗版/作弊`、`违规交易`、`侵权/抄袭`、`涉嫌诈骗`、`其他`。<br>                - 交互：点击标签实现单选（高亮主色），选中时有轻微缩放的点击动效。<br>            - **补充说明（条件判定区域）**：<br>                - **隐藏逻辑**：默认状态下，或选中前7个具体常规原因时，此输入框组件**隐藏**。<br>                - **展开逻辑**：当且仅当用户选中 **“其他”** 标签时，下方平滑展开多行文本输入区域。<br>                - **占位符**：“请输入详细说明（必填项）\.\.\.”。<br>            - **图片证据（选填）**：预留 65x65 的“\+”号上传位，点击调用系统原生相册，支持用户上传截图取证。<br>        1. **提交校验与反馈**<br>        用户点击底部红色【提交】按钮时，需执行以下前端校验：<br>        - **校验 1（必选）**：若未选中任何“举报原因”标签，拦截提交并 Toast 提示：“`请先选择一个举报类型！`”。<br>        - **校验 2（必填补充）**：若当前选中了“其他”标签，且“补充说明”文本框为空（去除首尾空格），拦截提交并 Toast 提示：“`选择“其他”类型时，必须填写详细说明！`”。<br>        - **成功反馈**：所有校验通过后，前端关闭举报弹窗，并弹窗 Toast 提示：“`✅ 举报提交成功！感谢您协助维护社区环境`”。（同时向后端“后台\-举报管理”模块写入该条举报工单数据）。|
|**动态详情页**<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjE1M2RkZWVlNjdlYTIyZDlmZWM5NjMzYzM3ZjNiMjZfYWZhNmZhMWRiNWU0MWY5MWM3ZmVhOWU2ZjZiOWYyMmFfSUQ6NzYyMzk5ODI2OTYzNDU2MzAyNV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWQ0ZDMxMGUyZjM0NmE4OThlMzg0OGU2ODk4NGQwYWNfMmQ3YWM4N2VhMDdmMWZhNWY1NmM0MjcyODAyOTZlMDdfSUQ6NzYyMzk5ODI2ODg3NTU3NDQ5M18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|- **右上角更多交互：**顶部导航栏右上角新增“\.\.\.”图标。点击唤起底部半屏动作面板（Action Sheet），包含：分享（国内：微信、朋友圈、微博、QQ、复制链接、国外等渠道复用详情页分享）、转发动态、编辑内容（仅作者可见）、举报**。**<br>    - **媒体区 \(Media Wrapper\)**：顶部显示，仅当存在媒体且非转发贴时展示。<br>    - **自适应限高**：容器最大高度限制为 `60vh`，图片/视频均使用 `object\-fit: contain` 或自适应等比缩放，确保横竖图均能完整展示且不留过多黑边。<br>    - **视频播放**：视频直接调用原生 `\&lt;video\&gt;` 控件进行播放。|
|**动态详情页\-业务挂载区**|<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDU1MzU4NzZjOTE5MzQ4ODdlMWMwZWIzZTQ4YWY1OThfNWE4MmM5NjMxNTlmY2I0NmNiNWQyNTFiMmQ1NjczZjJfSUQ6NzYyMzk5ODQ5OTIxMDMxNjk5M18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YzU5MGJmMDNiYjA1MDExNGVhNjg0ODEzNDUyMTNkZDVfN2ZkODIwOTE3NGZmNzY4Y2YwMjE3Yjk3ODQ4MmMzYTRfSUQ6NzYyMzk5ODUwMDEyNDUyNzg0MF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzkyMzMzZjI5NDU5NmEwOGJmMTc4YmU3NmY5NjUxNzNfZjcxMzUzYjM5YzFhNmRhZGExZTQwMzg5NjE2ODY4YzlfSUQ6NzYyMzk5ODQ5OTYzODg1NjY1NV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)|- **分享码框**：蓝底虚线框，展示导入的分享码类型及名称，右侧带“复制分享码”按钮，点击后进行复制并toast提示“已复制到粘贴板”。<br>- **游戏资料卡**：若动态关联了游戏，在正文下方内嵌展示深色质感的游戏卡片（含封面、名称、描述、评分、类型与跳转箭头），点击可跳转游戏详情页。<br>- **专区标签**：若动态关联了专区，在正文下方内嵌展示专区标签（含标签icon和名称）<br>    - 交互逻辑：【游戏类型标签】点击可跳转游戏详情社区tab页，【非游戏类型】点击可跳转社区分区首页<br>|
|**评论系统**|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzUwMmFjMThkODAwYzU1ODRlMGIwYmNmNThkZmUwYjJfZTFiNTgzYTA2ZjUzNWRlMDcxODlkNjAyODUzN2U1NjdfSUQ6NzYyMzk5ODY1MjUyNjIzNDU3NV8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>|- **楼层展示**：一级评论与二级嵌套回复，均支持点赞和回复。具备身份外显（作者、我、互相关注）。<br>    - 交互：点赞后，点赞数\+1；点击回复，显示输入框，输入框默认文案为“回复@评论人昵称”<br>- **折叠逻辑**：<br>    - 默认仅展示首个评论，其余评论默认隐藏，显示“展开 X 条回复”按钮。<br>        - 交互：每次点击展开按钮，固定展示3条回复<br>    - 单挑评论内容最多5行，超过\.\.\.<br>    **评论排序逻辑：**<br>    - **第一条评论按照热度分降序排列：**<br>        - **计算因子：**点赞数（正向权重）、收藏数（正向权重）、回复数（二级评论数量，含回复的回复，按总条数累计）、发布时间（新评论获得一定初始曝光，时间衰减因子）<br>        - **计算公式：热度分 = **\(动态点赞数 \* a \+动态收藏数 \* b \+ 动态回复数 \*c \) \* 时间衰减因子 <br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MGM2MDY5YjczMjc2OTVhNjNjOTc4NGFhYmM1YmJmYzBfNTRlODE3YTNhNzFiZDcyNWJmMzY5ZDU4OGFkZjM0MzhfSUQ6NzYyMzk5ODc2NTcxNDQ1OTgyOV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>    - **最新评论强插排序：**每10个回复排序列表中，，找出当前时间最新的N条评论（N=3），确保它们出现在前2\-10位（随机不相邻的3位，比如第M = 2、5、7位）<br>    - **作者评论强插排序：**作者单条回复的首个二级评论回复默认置顶<br>    - **二级评论：**按照时间从二级评论默认 **按发布时间倒序**（最新的显示在最下方，即时间流动顺序），并参与动态和评论的热度计算<br>- **底部互动栏**：悬浮底栏，默认展示假输入框与转评赞数据；点击假输入框唤起全屏半透明遮罩与真实输入框（带虚拟键盘弹起动效）。|
|**发布器与草稿箱**<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDk0MGU3OTM4MjVmYTI5OTY2NDhhNjcwZGUxZDIwNmVfMDA0ZDkyYzNiMTgyNGQ2MzhmM2ZlMDBhNzM0NzhmZGNfSUQ6NzYyMzk5OTEzMDQxNTI4NzQ4OF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTE1YTkyMDhlNTMyNWU1MGQxNTU0MGExMmI4N2FlNGZfZjI5NmQ4NDA1ZGU1MTE5ZTIxZTI1MWEzMzcxNWYwNzZfSUQ6NzYyMzk5OTA3NzE3MzI4NDA2NF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Njc1NmMwZGQ0MTQ2NDg3OWNhYzYwYzcwODJjMDFiZjNfNTc5YjNmNjJiNjc3Nzk5YTlhZWU3OGE1N2Q2ODgwMGFfSUQ6NzYyMzk5OTY0NDE4ODI0OTI4MF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTc0MjIwM2UyYTJmOGM0NTkwYzhjMTMwZTVjOGFiZDJfOGUzMGJkZjA5NWRmZWQ2ODgzNDhhZjg1YmYyOGI3ZDNfSUQ6NzYyMzk5OTY0NjU2MTU4NjM1NV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWMwZDM4MGExMmI0OTA1ZWRjNDg5MWY1NmQzMzljOGZfZWU5ZTQwY2YxYzViOGZhYzExN2IzZTY4MjA2MjQ1OGZfSUQ6NzYyMzk5OTY0NDEwNDUxMDY2Ml8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Yjg3MzM4N2JkN2YxMTdkMDU2NWNlYjdiOThkY2NlZGNfOTVmNTA1ZGZmYzJmNTIzN2NmYWRhZWY3MjQ2NDFlNDVfSUQ6NzYyMzk5OTY0NTEwODE5NDUwM18xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmM0NTQxM2VjMmJmMWVkMTY4MTVlZDU0OTYxYjAzNjRfOGIyZmZlMDU2NTc5YTg0ZjA3NDE2ZDgyMjljMmNhOGFfSUQ6NzYyMzk5OTgzNjM1MDUxNjE4NF8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTEzMzdkODNjMzM5MTkzYjQ0YzYxNGE2OTI2ODgzNzhfNmE2ZGMwYmM0YjlmOThjMmFiOThkMjZhN2NkZjRiNmVfSUQ6NzYyMzk5OTg4OTkxNTg0MTcyN18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmI4NjFmY2MwZTA2YWZkMWI2MzRiNTJiYWExYzIyZDlfMzE0M2MxZWU1NzI5MGMyOTFmYzdhZmE3MjQ5MjQ5MWVfSUQ6NzYyMzk5OTkxMDc5MDIyMDk5OF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|- **顶部导航栏**：<br>    - 左侧：【返回】按钮（带向左箭头）。<br>    - 中间：标题（“发布动态” 或 “转发动态”）。<br>    - 右侧：【发布】主操作按钮（品牌色胶囊样式，文字加粗）。<br>- **标题输入区（仅主动发布可用）**：<br>    - 样式：占位符为“加个吸引人的标题”。<br>    - 交互：点击获焦，唤起系统/虚拟键盘。<br>- **正文富文本输入区**：<br>    - 样式：常规字号（16px），占位符为“分享你的游戏见解\.\.\.”，高度自适应扩展。<br>    - **话题高亮交互（重点）**：该区域为富文本属性（`contenteditable`）。当用户通过底部工具栏插入话题时，话题文本（如 `\#发现好游戏`）必须以**品牌蓝色（Primary Color）且加粗**的样式插入当前光标位置，视觉上向用户暗示该内容发布后具备点击跳转属性。<br>- **已关联数据展示区**：<br>    - 位于正文输入框下方，采用流式布局向下排列。<br>    - 当用户插入“关联游戏”或“配置方案”时，在此处生成深色带边框的横向数据卡片。<br>    - 当有用户插入“关联分区”时，在动态下方生成分区icon和名称<br>        - **关联分区规则**：<br>            - 若用户在“全部”、“关注”等综合Tab下发布，且未主动关联游戏，动态被归类为“分享/综合”分区。<br>            - 若用户在特定游戏Tab（如“GTA 5”）下发布，动态**自动继承**该游戏分区属性，且即使不主动关联分区，并增加提示文案“自动发布至该分区”，系统也会在动态详情页正文底部自动挂载该游戏专区的标签链接，选择分区选项不可点击。<br>    - **卡片移除交互：**每张卡片最右侧带灰色`x` 关闭按钮，点击后立即移除该卡片，输入区布局自动上移补位<br>底部固定于屏幕下方（键盘弹起时随键盘上推），自左向右包含以下功能：<br>1. **图片/视频选择（Icon）**<br>    - **交互**：点击唤起原生系统相册（或自定义媒体选择器）。<br>    - **规则**：最多支持选择 9 张图片或 1 段视频。选中后在正文下方生成缩略图矩阵，缩略图右上角带有红色 `x` 可删除。<br>2. **Emoji 表情（Icon）**<br>    - **交互**：点击后，收起默认打字键盘，从底部向上弹出包含常用 Emoji 的面板。<br>    - **状态切换**：若当前已是 Emoji 面板，再次点击则收起面板，恢复虚拟/系统键盘；点击输入框空白处也可随时唤起键盘并收起表情面板。<br>3. **插入话题（****`\#`**** Icon）**<br>    - **入口：**发帖时点击 `\#` 号触发全屏弹窗。<br>    - **搜索框**：顶部吸顶搜索栏。<br>    - **排序：**推荐话题\&amp;热门话题均按照浏览量降序排列<br>    - **弹窗功能**：顶部带搜索框支持搜索话题；下方展示“推荐话题”列表和“热门话题”列表（含话题名称与浏览量）。<br>        - **推荐话题：**后台人工配置的话题，显示话题名称，列表右侧带浏览量展示，显示规则为千\-\&gt;k，万\-w，展示，精确1位小数，最多展示10个，可带标签，如【活动】。<br>        - **热门话题：**按照浏览量降序排列的top10话题，**仅展示当前分区下的热门话题，如社区首页发布的，则是全站的热门话题**。<br>    - **插入动作**：点击任意话题列表项，弹窗关闭，正文输入框光标处自动插入蓝色高亮话题标签，并在末尾自动补充一个空格以便继续输入。<br>    - **交互**：点击列表任意项，弹窗关闭，发帖正文光标处自动插入蓝字高亮且不可拆分的 `\#话题名`。<br>4. **关联游戏（胶囊按钮）**<br>    - **交互**：点击从右侧滑出全屏【关联游戏弹窗】。<br>    - **弹窗功能**：带搜索栏，下方以 A\-Z 首字母索引展示游戏列表（含封面、名称、评分、类型）。<br>    - **排他规则**：一条动态**最多只能关联 1 款游戏**。选中后弹窗关闭，底部展示区生成游戏资料卡片。若已有游戏，再次选择会**直接替换**原卡片。<br>5. **配置方案（胶囊按钮）**<br>    - **交互**：点击从底部向上弹起半屏动作面板（Action Sheet）。<br>    - **面板功能**：展示用户已云分享生成的“启动配置方案”与“按键布局方案”列表。<br>    - **插入动作**：点击任意方案，面板收起，并在底部展示区生成带有虚线边框与对应 Icon 的特殊配置卡片，Toast 提示“已插入配置方案”。<br>    - **排他规则**：一条动态**最多只能关联 1 套启动配置\+1套按键布局配置**。若已有方案，再次选择会**直接替换**原卡片。<br>##### 特殊状态逻辑：AI标记与转发模式<br>- **AI 声明勾选**：<br>    - 位于底部工具栏的正上方，展示文案“包含AI合成内容”<br>    - **交互**：点击整行区域即可切换勾选状态。勾选后，发布的信息流数据中将带上AI标记。动态底部增加“作者声明：内容由ai辅助完成”描述<br>- **转发模式下的特殊约束**：<br>    - 若当前是通过“转发”进入此页面，**强制隐藏**：标题输入框、关联游戏按钮、配置方案按钮、包含ai合成。<br>    - **回显原贴**：在正文输入框下方，强制展示一张不可编辑、不可删除的灰色【原贴引用卡片】（包含原贴发布人头像 \+ 昵称 \+ 主题；编辑页不可点击，发布后在动态详情页内可点击）。<br>    - **关联专区：**与原动态游戏保持一致<br>    - **转发后状态展示：**标题自带【转发】，点击原贴进入原贴动态详情页<br>##### 3\.3\.5 退出拦截与草稿交互<br>- **触发时机**：用户点击左上角【返回】按钮或执行物理返回手势时触发校验。<br>- **校验规则**：系统检查“标题”、“正文（富文本内容）”、“关联专区卡片”中**任意一项是否非空**。<br>    - **若全为空**：直接退出，关闭页面。<br>    - **若存在内容**：拦截退出行为，并在屏幕中央弹出“二次确认 Dialog 弹窗”。<br>- **弹窗交互**：<br>    - 弹窗文案：“退出编辑 \- 是否保存当前编辑内容为草稿？”。<br>    - **点击【不保存】**：清空所有输入数据和关联卡片缓存，彻底关闭发布页。<br>    - **点击【保存草稿】**：将当前所有输入项及卡片信息序列化存入本地缓存，关闭发布页，并底部 Toast 提示“草稿已保存”。<br>##### 3\.3\.6 发布提交流程与数据流转<br>- **前置校验**：用户点击右上角【发布】按钮时，需校验内容是否达标。<br>    - 若标题、正文均为空，且未附加任何媒体/卡片，Toast 提示：“请输入内容后再发布”，中止流程。<br>    - **内容审核：**接入文本、图片和视频审核，文本违规直接提示**“文本/图片/视频涉及违规内容，请调整后再试”**<br>- **提交与反馈**：<br>    - 校验通过后，清空本地草稿缓存。<br>    - Toast 提示：“发布成功！”。<br>    - 发布页向右平滑滑出（收起），同时触发首页信息流容器滚动至最顶部（`scrollTo\(0,0\)`）。<br>- **分区归属与数据追加**：<br>    - 系统立即将新生成的动态对象追加至前端列表数组的最前列（`unshift`）。<br>|
|分区偏好管理|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MGJmODI1MzIzYzMzYjdhZTlhNDUzZDcwMzIyYmYzNGVfMjE5NzIxNmY0ODYzNDgzNDNlMDBiNjYyZDI4ZjhjNWZfSUQ6NzYyNDAwMDQyNDA5NDIwNzE2N18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YjIwMzUzNTNmM2Q1MjQ3ZWIwYzk0ZTQ5MjM5NDJmMWFfMzc1YTZhNmMyNjc3ZDkxZDVlMmUyZjgyNjg5NjhkMTNfSUQ6NzYyNDAwMDQyMzEwODUyOTM1Nl8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)|- **初始化默认状态**：<br>    - 【首页展示】：默认配置 `Steam`、`GTA 5`、`配置分享`（3个）。<br>    - 【我加入的分区】：默认**为空**。<br>    - 【全部分区】：固定展示全部列表<br>##### 模块一：首页展示<br>- **定位**：直接映射并控制首页顶部的 Tab 栏构成。<br>- **展示样式**：药丸标签（Tag）流式布局。标签左侧文字，右侧为 `×`（移除）图标。<br>- **交互规则**：<br>    - **点击文字**：关闭管理弹窗，首页立即跳转并切换至该分区。<br>    - **点击 ****`×`**** \(取消固定\)**：该分区从首页 Tab 栏移除。<br>    - **限制条件**：必须至少保留 **1个** 分区。若仅剩 1 个，点击 `×` 时阻断并 Toast 提示 `“首页至少保留 1 个展示”`。<br>    - *注：移除此处的展示，****不等于****退出分区。*<br>##### 模块二：我加入的分区<br>- **定位**：用户已加入的专区合集。<br>- **缺省状态（Empty State）**：若用户未加入任何分区，该区域显示提示文案 `“暂无加入分区，赶紧加入吧”`。<br>- **展示样式**：药丸标签（Tag）流式布局。<br>- **交互规则**：<br>    - **状态联动**：如果该分区**已经**在【首页展示】中，标签左侧显示置灰的 `✓`，不可重复添加；如果该分区**未在**【首页展示】中，标签左侧显示蓝色的 `\+`。<br>    - **点击 ****`\+`**** \(固定至首页\)**：将该分区推送到【首页展示】列表中，并 Toast 提示 `“已固定至首页”`。<br>    - **点击文字**：关闭管理弹窗，首页跳转至该分区。<br>    - **限制条件**：【首页展示】上限暂定为 **5个**。若达到 5 个后点击 `\+`，阻断操作并 Toast 提示 `“首页最多只能固定 5 个专区”`。<br>##### 模块三：全部分区<br>- **定位**：浏览并发现所有可加入的新分区。<br>- **展示样式**：单行列表纵向排列（一行一个）。左侧为分区名称（字号15px，加粗，主文本色），右侧为操作按钮。<br>- **交互规则**：<br>    - **未加入状态**：右侧按钮显示为主色调的药丸按钮 `\+ 加入`。点击后：<br>        1. 按钮立即变为 `已加入`（样式变为透明背景置灰）。<br>        2. 该分区立刻出现在\*\*【我加入的分区】\*\*模块中。<br>        3. Toast 提示 `“已成功加入”`。<br>        4. *（关键）纯加入操作，****不要****自动将其固定到首页展示中。*<br>    - **已加入状态**：右侧按钮显示为置灰的 `已加入`（无点击事件响应）。<br>    - **点击名称**：点击左侧文字区域，可跳出管理弹窗，进入该分区的详情流。<br>##### 全局联动与状态同步<br>该页面的状态必须与信息流（Feed）中的专区 Header 状态保持强一致：<br>1. **Feed 侧加入 \-\&gt; 管理侧同步**：用户在社区浏览某专区时，点击该专区顶部头图里的“加入”按钮，该专区需同步出现在【分区管理】的“我加入的分区”列表中，并且“全部分区”中的按钮变为“已加入”。<br>2. **Feed 侧退出 \-\&gt; 管理侧同步**：用户在专区顶部点击“已加入”进行取消（退出圈子），该专区需从“我加入的分区”中移除。且如果该分区正处于【首页展示】中，也一并将其从【首页展示】卸载取消固定。|
|视频审核流|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTY1MWI2ZjI0YjZjZTFhM2U1YjdjZDVhOWVjMTA4MGNfNDI3NzQ5ZTM3MGM1ZTc1NWJhOTg2MGZiNTNmNmUxMGZfSUQ6NzYyNDAwMDk5ODgxMTI1ODA0OV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTU1NTAzMTJkNmZhMDE0MGQ3YmM1Y2IwNTM3ZDBmMDNfYzc5YzkzMjFkOGJhZDZjYWIxZjYxNjFhYTY3YzhmMDJfSUQ6NzYyNDAwMDk5ODg4NjkxOTM4OF8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br>|### 视频审核展示逻辑<br>- **触发条件**：用户上传视频动态后，后端会进行安全涉黄/暴/政等审核。<br>- **列表显示**：审核中或违规则列表不可见<br>- **详情显示**：仅作者可见详情状态，审核通过后所有人可见<br>|

---

### 4\.3\.1\.1 V2\.0 新增模块（2026\.05\.25更新）

> 以下为V2.0改版新增内容，修改内容以<font color="#4e73ff">蓝色加粗</font>标识。

|**模块名称**|**图示**|**展示&交互说明**|
|---|---|---|
|<font color="#4e73ff">**顶部主Tab改版**</font>|（见demo）|- <font color="#4e73ff">**Tab结构变更**</font>：原"游戏/社区"改为 **关注 / 游戏圈**（移除"探索"Tab）<br>- **关注Tab**：展示已关注用户/游戏圈的动态流<br>    - 空态：居中展示"还没有关注内容"+ 金色文字"去游戏圈看看 →"（点击切换至游戏圈Tab）<br>- **游戏圈Tab**（默认选中）：展示游戏圈二级tab + 帖子列表<br>- **交互**：点击Tab切换，不刷新页面，Tab下内容区域切换<br>- **异常处理**：网络异常时保留当前Tab选中态，toast提示"网络异常，请重试"//2026.5.25修改|
|<font color="#4e73ff">**游戏圈二级Tab（icon+文字）**</font>|（见demo）|- <font color="#4e73ff">**展示形式变更**</font>：每个Tab改为 icon + 分区名称<br>- **默认Tab**："全部"（右侧带偏好管理icon，点击拉起分区偏好管理弹窗）<br>- **Tab来源**：由用户pin的分区决定（偏好管理配置），后台配置icon<br>- **溢出处理**：Tab数量超出屏幕宽度时，横向可滚动<br>- **交互**：点击某个Tab，帖子列表按该分区筛选刷新；若该分区有专区header则在帖子列表上方展示<br>- **异常处理**：分区数据加载失败时，仅显示"全部"Tab，其余Tab不展示//2026.5.25修改|
|<font color="#4e73ff">**置顶区**</font>|（见demo）|- <font color="#4e73ff">**新增模块**</font><br>- **位置**：分区header（封面+描述+加入按钮）和三级sub-tab之间<br>- **展示条件**：当前分区有置顶帖时才展示；"全部"Tab下不展示<br>- **单条样式**：左侧橙色"置顶"标签 + 帖子标题（单行截断）+ 右侧灰色箭头<br>- **交互**：点击整行跳转至该帖子详情页<br>- **多条置顶**：支持多条，纵向排列<br>- **异常处理**：帖子被删除后，置顶区自动移除该条；置顶帖为0时置顶区整体隐藏//2026.5.25修改|
|<font color="#4e73ff">**三级Sub-Tab（综合/官方/求助/攻略）**</font>|（见demo）|- <font color="#4e73ff">**新增模块**</font><br>- **位置**：分区header（含置顶区）下方<br>- **Tab列表**：综合（默认选中） / 官方 / 求助 / 攻略<br>- **筛选逻辑**：<br>    - 综合：展示该分区全部帖子<br>    - 官方：仅展示带"官方"身份标签的用户发布的帖子<br>    - 求助：仅展示用户发帖时选择"发布到：求助"的帖子<br>    - 攻略：仅展示用户发帖时选择"发布到：攻略"的帖子<br>- **交互**：点击Tab实时筛选帖子列表，不影响分区header；切换时列表回到顶部<br>- **异常处理**：无内容时显示空态"当前分类暂无内容"//2026.5.25修改|
|<font color="#4e73ff">**帖子标签展示**</font>|（见demo）|- <font color="#4e73ff">**新增标签类型**</font><br>- **求助标签**：红色底白色字，展示在帖子标题文字前方。触发条件：用户发帖时选择"发布到：求助"<br>- **攻略标签**：绿色底白色字，展示在帖子标题文字前方。触发条件：用户发帖时选择"发布到：攻略"<br>- **官方标签**：品牌色底黑色字，展示在用户昵称右侧。触发条件：后台配置了"官方"身份标签的用户<br>- **置顶标签**：仅在置顶区显示，帖子列表内不重复展示//2026.5.25修改|
|<font color="#4e73ff">**发帖页 - "发布到"功能**</font>|（见demo）|- <font color="#4e73ff">**新增功能**</font><br>- **位置**：底部工具栏正上方，与"包含AI合成内容"checkbox同一行（左侧AI checkbox，右侧发布到选项）<br>- **展示形式**：三个pill并排平铺（非下拉），单选关系<br>- **选项**：全部（默认选中，金色高亮）/ 求助（选中时红色高亮）/ 攻略（选中时绿色高亮）<br>- **发布后效果**：选中"求助"则帖子标题前自动带红色"求助"标签；选中"攻略"则带绿色"攻略"标签；选中"全部"则无标签<br>- **交互**：点击切换，toast提示"将发布到「XX」"<br>- **异常处理**：未选择时默认为"全部"；网络异常时保留选择状态不丢失//2026.5.25修改|
|<font color="#4e73ff">**横屏切换按钮位置**</font>|（见demo）|- <font color="#4e73ff">**位置变更**</font><br>- **原位置**：tabs-toolbar右侧（"横屏模式"文字按钮）<br>- **新位置**：顶部搜索栏右侧，消息通知icon左侧<br>- **展示**：圆形icon按钮<br>- **交互**：点击切换横竖屏模式//2026.5.25修改|
|<font color="#4e73ff">**横屏模式布局**</font>|（见demo）|- <font color="#4e73ff">**布局变更**</font><br>- **帖子列表**：一排1个帖子（单列布局，原为双列）<br>- **底部导航**：隐藏<br>- **分区header**：加圆角边框<br>- **异常处理**：横屏切换时保留当前滚动位置和Tab选中态//2026.5.25修改|
|<font color="#4e73ff">**底部导航栏（5Tab）**</font>|（见demo）|- <font color="#4e73ff">**结构变更**</font><br>- **原结构**：3个Tab（探索 / 手柄 / 我的）<br>- **新结构**：5个Tab → 首页（合并原游戏库） / 社区（默认选中） / 玩游戏 / 排行榜 / 我的<br>- **选中态**：icon+文字高亮为品牌主色<br>- **未选中态**：灰色<br>- **横屏时**：底部导航隐藏//2026.5.25修改|


### 4\.3\.2 后台系统（B端）

功能demo：[社区后台demo](https://gistcdn.githack.com/z36358631-ship-it/55f66f3b65cde48e3f34c94711380b4b/raw/820b2922ae0ca546d6a6188ca73fa27f8c3515ba/%E7%A4%BE%E5%8C%BA%E5%90%8E%E5%8F%B0demo.html)

|**模块**|**图示**|**校验与风控逻辑**|
|---|---|---|
|**分区管理**|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGNmYjhmOWI4YzNkM2MwZTc2ZTVlODk0YzU0MGI0MTJfODNhM2Q1ODRhMjY3ZDIzYjg5YmEyNDEyMzQ1YjgxYTBfSUQ6NzYyNDAwMTE3NTk2NDk2MTk4Ml8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGIxZjgxYzJkNjQ1NDQ5ZjlhYjEyN2NjMDU0YjE5MTFfOWNhYmZhZWQ5YzIyNGQ4NWNjMjNhN2FiNjVlOGRiOWFfSUQ6NzYyNDAwMTM5NjQ2Mzg0ODM4Nl8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|分区列表与检索<br>- **筛选条件**：支持按 分区ID（精确）、分区名称（模糊）、APP协议（全部/Android/iOS）、分区类型（全部/游戏/平台）进行组合检索。<br>- **列表展示字段**：排序值、分区ID、Icon缩略图、分区名称、APP协议、分区类型、关联平台ID、关联游戏ID、创建时间、状态（正常/隐藏）。<br>- **【编辑】：点击进入编辑分区弹窗**<br>- **【详情】：**点击列表【详情】，支持查看该分区大盘数据汇总，包含：发布动态数、浏览量、点赞量、收藏量、回复量、转发量（用于评估该分区活跃度）。<br>- **【删除】**：点击检测分区动态为0时允许清空，否则拦截并弹窗阻断“优分区下存在关联内容，无法直接删除，请先清空分区下的动态或隐藏分区”|
|**新建/复制/编辑分区弹窗**<br>|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzY0NjkxYjRhNmY2YWZhNDJlMmVlODZjZmFlYjgzNjZfZjBmYzgxODU2NWNiMmViZTcyNTNjZTRkZmJhMzVkODlfSUQ6NzYyNDAwMTI4ODIzMDE0NTIwM18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|支持动态扩展社区分区，，配置项包含：<br>- **基础信息**：分区名称（必填）、Icon上传（支持图片格式限制）、分区描述。编辑、复制时仅标题不同，参数回显<br>- **业务属性**：<br>    - **分区类型**：单选（游戏 / 平台 / 其他）。<br>    - **APP协议**：单选（双端互通 / 仅Android / 仅iOS），用于控制多端发版时的可见性。<br>    - **资源关联**：关联平台ID（如 `P\_1001`）、关联游戏ID（如 `G\_9901`），用于实现前端发帖时游戏卡片的自动挂载与跳转联动。<br>    - **排序值**：输入整数，数值越大前端横向Tab越靠前。<br>    - **状态控制**：正常 / 隐藏。设置为“隐藏”时，前端分区导航栏不再展示该分区，但存量历史动态依然保留。<br>|
|**身份标签**|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjI1MTMyODZlYzk3MGRhZTA4YWVkZWNiYjJiMDEzNjlfNTFjYzQyMDk1ZDc3NjUzMzU0Y2YxMDI0MTFjZWM2YTlfSUQ6NzYyNDAwMjgxMTIwMTk5ODAwNF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWE3MjMwZTk4ZGRjMzNiZWMyMGU2YWJkYzc4NjE1MmZfODYyMTcxODM4NjdjOTdhMzRkY2NiYzdmOWZhOWIxM2JfSUQ6NzYyNDAwMjk0ODMzNTQwNjAyOF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTk1YTRiYzk5YjRjZjUwOWQ3YzIxZDc3NTRjZDk3ZjhfNjU3OWM5NzYwOTc5ZWZhNDBkN2Q3NDU0NjE0MmVlZmZfSUQ6NzYyNDAwMjk0ODM1NjM0NDc3M18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzllYTliOGE1NWQyMWZkMzY1ZGJlY2I2MjhlMmU4NGFfMTJhYTE2OWY0MDg3NmM3NGI1YTAyNTJmYmRkOTk3NTlfSUQ6NzYyNDAwMjk0ODQ4MjE0MTE0OV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MGVmYWUzZmNmNmViZmRlODM2YzU0YmJkOTg2N2YzYmFfYzczYTRiZDZiNThiMjMxMDE3MGVlNDU2NmJhYzA1Y2VfSUQ6NzYyNDAwMjk1MjAwMjA0NjkyMV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)|用于配置前端用户昵称旁的高亮身份标签（如：官方认证等），建立社区KOL体系。<br>#### 1、身份标签配置<br>- **筛选条件**：身份ID、身份名称、状态（正常/下架）。<br>- **新建/编辑表单参数**：<br>    - **基础与UI信息**：标签名称、文字颜色（色值）、背景颜色（色值）、功能描述。<br>    - **权限内容（核心）**：采用多选框配置该身份在前端拥有的特权，包含：**【身份标识】**（外显Title）、**【置顶】**、**【删动态】**、**【静默动态】**（使得该身份用户在前端App的帖子“更多”菜单中拥有对应版务权限）。<br>    - **状态**：正常 / 下架（下架后该身份全局失效，不再外显且权限收回）。<br>- **标签属性定义**：<br>    - **标签名称**：如“硬核高玩”（必填，前端直接展示）。<br>    - **标签类型**：分为系统级（如官方客服）与业务级（如达人玩家）。<br>    - **UI定制**：支持使用拾色器（Color Picker）自定义标签的**文字颜色**与**背景颜色**，以适配前端高亮展示诉求。<br>    - **状态管控**：正常 / 下架。下架后，前端已绑定的用户昵称旁不再外显该标签。<br>#### 2、赋权与人员详情管理 \(核心\)<br>- **新增人员**：点击列表右侧【新增】，弹窗输入\*\*“用户UID”**并设置**“有效期（默认永久）”\*\*。提交后该用户立即获得该身份及对应特权，列表的“关联用户数”同步\+1。<br>- **人员详情（二级页面）**<br>用于精细化管理某一身份标签下到底有哪些用户，以及他们的贡献度。<br>- **查询维度**：支持按“用户UID精准查询”及“时间段筛选”，支持【导出数据】。<br>- **列表展示**：展示带有此身份标签的用户列表，包含：用户UID、账号昵称、手机号、发布动态数、浏览量、点赞量、收藏量、回复量、转发量、首次绑定时间。<br>- **操作**：支持【撤销身份】，二次确认后立即剥夺该UID的此项身份标签。<br>- **手动赋权**：支持通过弹窗输入用户 `UID` ，为单名玩家下发特定身份。<br>- **撤销身份**：支持在列表中单条点击“撤销身份”，二次确认后即刻回收该用户的前端标签展示权。<br>#### 3、删除限制<br>- 已关联大于 0 名用户的标签，后台严格**禁止删除**，拦截并提示需先在人员详情中解绑或直接“下架”该标签。|
|**举报与动态风控治理**|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Nzg0ZWJjNmY1YmFjYWY5MzNkMzIyY2RhZmY1OThmZTFfOWRkOWZkMDFmYjhiZThjM2Y0MGIwYjc4ODI4YjUxZTdfSUQ6NzYyNDAwMzE4MDQwOTgzNDQzM18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)|### <br>对前端（Feed流及动态详情）的用户生成内容（UGC）进行强力审核与秩序维护。<br>#### 1、多维数据检索<br>作为高频操作台，提供丰富的组合查询能力：<br>- **范围查询**：所属分区（下拉单选）、动态ID（精准检索）。<br>- **作者检索**：作者账号/UID（精确/模糊匹配）。<br>- **内容检索**：动态内容（关键词模糊搜索）。<br>- **时间检索**：发布时间段选择（高精度时间范围组件，精确至秒）。<br>- **状态筛选**：全部 / 通过已外显/疑似待审核/违规已拦截/已静默/已删除。<br>    - **重要：**接入外部云服务商的审核结果，显示到状态内<br>        - **外部审核通过：**状态为 **通过已外显**<br>        - **外部审核不通过：**状态为 **违规已拦截**<br>        - **外部审核不确定：**状态为 **疑似待审核**<br>#### 2、列表展示与业务操作<br>列表需清晰透出动态的核心要素与转化效果，防范违规内容。<br>- **列表字段**：勾选框、动态ID（附带“置顶”标记）、所属分区、作者信息（昵称、UID、手机号）、发布时间、内容摘要（超出截断）、数据表现（浏览/点赞/收藏/回复/转发）、状态。<br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmY4ZWQ1OGQ3MTRmYzc3MmEwNmQ2OGQ1MWY1MzgxNjlfZTc4ZjQ0NTk3Y2I2NGQ3OGQ3MGRjMGZhYTkyNjA4MmFfSUQ6NzYyNDAwMzI3NTgxMzUwNjI0N18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>- **核心管控操作**：<br>    - **查看：**点击“查看”后，跳转H5动态页查看动态详情<br>    - **置顶 \(Pin\)**：点击“置顶”后，该动态前端信息流强制排在最前方，后台列表也会将其排序置顶并增加 UI 角标。支持“取消置顶”。<br>    - **加入精选：**点击“加入精选”后，该动态前端信息流可显示在精选tab下，支持“取消精选”。<br>    - **静默 \(Silence\)**：将动态状态改为“静默（作者自见）”，前端大盘不再分发，仅该作者个人主页自己可见。<br>    - **解除静默：**将动态状态改为“**通过已外显**（所有人可见）”<br>    - **删除 \(Delete\) / 恢复**：软删除处理，对所有用户（含作者）不可见；支持容错恢复机制。<br>    - **审核通过：**点击后人工纠错，恢复为“通过已外显“<br>    - **审核不通过：**点击后人工审核违规，恢复为“**违规已拦截**“<br>    <br>#### 3、批量操作与数据导出<br>- **批量管控**：配合列表左侧多选框，支持【批量静默】与【批量删除】。需带有防呆机制，未勾选任何内容时按钮处于置灰禁用（Disabled）状态。<br>- **导出文件**：支持基于当前筛选条件，将动态列表数据导出为 CSV/Excel 文件，用于后续运营复盘与留档分析。|
|热门话题管理|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmVlNjE5MzhhZjRlMzM0ODhhYjY2Y2U2M2RiNjIwZDRfMGZmYjcxMWNkNWE5MzFiMDllYThhMjc0NDY5YzcyZDlfSUQ6NzYyNDAwMzQ0NjA0NDA1MjQxN18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWU1MjBiYzJjYWMyNTBmNDdjMjVlYjM3MDU4Y2YxODBfNzBiNDc5MjQxZDE2ZWQzNGRkNmRlYWUwOGYxMjk1MGRfSUQ6NzYyNDAwMzQ0OTQwNjk5OTQ4M18xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDk5Nzk5MjI3YThmYjRjYjU4NGZlZDliZDUwNjYwMzVfZjU0NWY2MjI4ZDM1MDI0MzExYTdlMmVkMTk2ZTJkMTFfSUQ6NzYyNDAwMzQ0NjY5ODQ0NTc1NF8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|#### 1\.1 顶部筛选区<br>- **话题内容**：文本输入框，支持模糊匹配查询。<br>- **APP协议**：下拉选择（全部、Android、iOS、双端互通）。<br>- **创建时间**：通用时间段范围选择器，筛选话题被创建的时间。<br>- **状态**：下拉选择（全部、上架、隐藏）。<br>- **操作**：【查询】与【重置】按钮。<br>#### 1\.2 列表展示与操作<br>- **列表排序**：默认按创建时间倒序排列。<br>- **数据字段规范**：<br>    - **话题ID**：系统自动生成的唯一标识（如：TOPIC\_1001）。<br>    - **话题内容**：加粗品牌色展示，需包含 `\#` 符号（如：\#GTA5神仙打架\#）。<br>    - **语言 / APP协议**：展示对应分类（协议使用蓝色药丸标签包围）。<br>    - **关联动态数**：使用千分位展示（如 1,250）。<br>    - **浏览量 / 参与人数**：**前端展示规则**：自动转换为“万”级单位，保留 1 位小数（例如 8890000 转换为 889\.0万）。<br>    - **有效时间**：展示“开始时间 至 结束时间”（格式：`YYYY\-MM\-DD HH:MM`）。<br>    - **状态**：正常态展示绿底绿色 `上架中` 标签；隐藏态展示灰底灰色 `已隐藏` 标签。<br>- **操作列**：<br>    - **【详情】**：点击跳转至二级页面“话题动态详情页”。<br>    - **【编辑】**：点击拉起话题编辑弹窗。<br>    - **【隐藏/重新上架】**：点击实时切换话题状态，对应整行数据如果是“已隐藏”状态则整行背景透明度降低变灰（`opacity:0\.8`）。  不透明度：0\.8）。<br>    - **【删除】**：点击弹出二次确认（“确定要删除话题 \[ID\] 吗？删除后不可恢复！”），确认后彻底删除。<br>#### 1\.3 弹窗：新增/编辑热门话题<br>点击列表右上角【新增话题】或列表操作列【编辑】唤起居中模态弹窗。<br>- **表单字段与校验**：<br>    - **话题内容**（必填）：文本框。输入限制需校验，如不能输入特殊违规字符。<br>    - **APP协议**（必填）：下拉框（双端互通、Android、iOS）。<br>    - **开始时间 / 结束时间**（必填）：`datetime\-local` 时间选择器，精确到分。<br>    - **状态**（必填）：下拉单选（上架、隐藏）。默认选中隐藏。<br>- **提交动作**：点击【确定】，保存数据并刷新底部列表，右上角 Toast 提示“新增/编辑话题成功”。<br>#### 1\.4 二级页面：话题动态详情页<br>从热门话题列表点击【详情】进入。**用于管理挂载在当前特定话题下的所有动态内容。**<br>##### 1\.4\.1 页面头部与全局筛选<br>- **返回导航**：左上角【\&lt; 返回列表】按钮，右侧展示当前话题标识（“当前话题：\#XXXX\#”）。<br>- **动态筛选器**：**完全复用「动态管理」模块的筛选逻辑**，包含：所属分区、动态ID、作者账号/UID、动态内容、发布时间、状态。<br>##### 1\.4\.2 动态列表与操作（核心复用）<br>- **列表结构**：展示规则、字段排版**完全复用「动态管理」模块**（包含复选框、封面图、分区信息、作者、发帖时间、正文摘要、各项互动数据）。<br>- **标签与角标透出**：<br>    - 如果动态已被置顶，动态ID右侧展示红色 `置顶` 角标。<br>    - 如果动态被选为精选，动态ID右侧展示橙色 `精选` 角标。<br>- **单行操作列联动**：<br>    - **查看**：模拟跳转至 H5 前端动态详情页。<br>    - **置顶 / 取消置顶**：实时切换当前动态的置顶状态。<br>    - **加入精选 / 取消精选**：点击切换精选状态，同步给前端页面加精标识。<br>    - **状态流转拦截**：<br>        - 当前为“通过已外显”：可【静默】或【删除】。<br>        - 当前为“疑似待审核”：可【通过】或【不通过】。<br>        - 当前为“违规已拦截”：可【审核通过】或【删除】。<br>        - 当前为“已静默”或“已删除”：可【解除静默】或【恢复】。<br>- **批量操作栏**：<br>    - 列表左侧支持 Checkbox 全选/多选。<br>    - 提供【批量静默】、【批量删除】功能。未勾选任何动态时，按钮为 `disabled` 禁用态；勾选后高亮。<br>    - 右侧提供【导出文件】功能。<br>##### 1\.4\.3 其他联动更改<br>- **操作记录**：全局「操作记录」页面的“操作模块”下拉筛选菜单中，需同步新增选项枚举值：`热门话题管理`。对该模块所有的编辑、上下架、删除等动作需写入系统日志。|
|举报管理|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MjczOGE5MWUwZDhhMjE3OGFhYzg5ZjIyODMxY2ZkYzdfMDkyMTZhMWJiODYwMzRjOTQ4NWNkMDZhNTVhYTIyMjVfSUQ6NzYyNDAwMzcxNjI0MDIzMTYwNV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br><br><br><br><br><br><br><br><br><br><br><br><br><br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWJkMzc3ZTYzODgyYmQxYzM5OTBkOGZlOTlmZWU5NjVfYmVjYjIzYzA1NTViNDQwOGNiYTZjN2YwODRhOTQwODNfSUQ6NzYyNDAwMzcxNjM3MDE3Mjg3Ml8xNzc5NzA0MTIyOjE3Nzk3OTA1MjJfVjM)<br><br><br><br><br><br><br>![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTk4MjgzMGU0NjNhYjZlODFjZjFlODRkODQ2ZTZhMzlfNDI2Y2U1YjA3ZWUzZjE5ZWI0ZWU4NTRkMDI1ZTU0N2JfSUQ6NzYyNDAwMzcxMzY4NjMwOTg0N18xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)|#### 1、多维数据检索<br>提供针对举报工单的复合查询与追溯能力：<br>- **举报原因**：下拉单选（全部、社区无关、色情低俗、辱骂/引战、盗版/作弊、违规交易、侵权/抄袭、涉嫌诈骗、其他）。<br>- **处理状态**：下拉单选（全部、待处理、已处理\(违规\)、已处理\(忽略\)）。<br>- **举报时间**：时间范围选择组件，支持精确至秒。<br>- **发布人\(账号/UID\)**：被举报动态的作者，支持精准/模糊搜索。<br>- **内容摘要**：被举报动态的文本摘要，支持关键词模糊搜索。<br>- **举报人\(账号/UID\)**：发起举报操作的用户，支持精准/模糊搜索。<br>#### 2、列表展示与业务操作<br>列表需清晰透出举报详情与被举报动态的关联信息，便于管理员快速判责：<br>- **列表字段**：勾选框、举报ID、举报原因、补充说明、发布时间、发布人、内容摘要、举报人、举报时间、状态、操作。<br>- **字段特殊展示规则**：<br>    - **补充说明**：当且仅当举报原因为“其他”时，展示用户填写的详细描述（溢出省略号并支持hover查看全部）；非“其他”类型默认展示“\-”。<br>    - **状态展示**：对应枚举值为 `待处理`（黄底警告色）、`已处理\(违规\)`（绿底成功色）、`已处理\(忽略\)`（灰底次级色）。<br>#### 3、核心管控操作<br>针对单条举报数据，管理员可进行以下处置：<br>- **查看动态**：点击“查看动态”后，模拟跳转至H5前端动态详情页，便于管理员结合上下文与评论区环境进行二次复核。<br>- **判定违规**：对于查实违规的内容，点击弹出【处理违规举报】面板，**支持对动态与用户进行多选组合处罚**：<br>    - **针对动态（复选）**：选中后展开动态处理下拉框。支持选项：【删除违规动态】或【仅静默动态 \(仅自己可见\)】。<br>    - **针对用户（复选）**：选中后展开用户处理下拉框（禁发动态时长）。下拉枚举值包含：【1天】、【7天】、【30天】、【365天】、【自定义输入\(天\)】。<br>        - *交互联动*：若选择“自定义输入\(天\)”，下方动态展开数字输入框（约束 `min=\&\#34;1\&\#34;`）。<br>    - *提交校验*：必须至少勾选一项处理对象（动态或用户）方可提交，提交后将举报单状态流转为`已处理\(违规\)`，并自动联动修改大盘中对应动态/用户的状态，记录操作日志。<br>- **忽略**：对于恶意举报或合规内容，点击弹出二次确认弹窗（“确定要忽略举报单 \[ID\] 吗？”），确认后举报单状态直接流转为`已处理\(忽略\)`。<br>#### 4、批量操作与数据导出<br>- **批量管控（批量静默 / 批量删除）**：<br>    - 配合列表左侧 Checkbox（支持全选/多选）使用。<br>    - **防呆机制**：未勾选任何行时，两颗批量操作按钮默认置灰（`disabled`）不可点击；勾选后高亮激活对应权限。<br>    - **业务逻辑**：点击后弹出二次确认（“确定要批量【静默/删除】选中的 N 个举报对应的动态吗？”），执行后将关联举报单状态置为“已处理\(违规\)”，并同步将**底层关联的动态数据**状态更改为“已静默”或“已删除”。<br>- **导出数据**：支持基于当前页面筛选器的生效条件，将举报工单列表数据全量导出至本地，用于质检与核对。<br>#### 5、对“操作记录 \(Operation Logs\)” 的增补说明<br>- 在全局「操作记录」页面的“操作模块”下拉筛选菜单中，需同步新增选项枚举值：`举报管理`。<br>- 管理员在举报模块中的任何判责行为（如：判定违规、忽略、批量删除、批量静默），其具体执行细节（如：`判定违规，执行操作: 删除动态，禁发用户 3 天`）必须完整写入操作记录日志表中。|
|操作记录|![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODBiZGMxMjZjZjAzOThmZjYwZDRhMDk3YjczMGFlY2ZfNmUzZTg2NDU1ZmQ2YjA5ZGFjYzIzNjZiZjkyZmMxNmRfSUQ6NzYyNDAwNDM2Mjk4NTQ3NTAxOV8xNzc5NzA0MTIxOjE3Nzk3OTA1MjFfVjM)<br>|### <br>为了满足运营诉求，增加全站后台操作的日志留存模块。<br>- **筛选检索**：支持按 **操作人**（输入姓名/账号）、**操作模块**（下拉选择：分区管理/身份管理/动态管理）、**操作时间** 进行筛选过滤。<br>- **列表展示**：详细展示 操作时间、操作人、操作模块（Tag高亮）、操作类型（新增/修改/删除/操作人员等）、操作详情（如：”将动态 \[D88201\] 设置为置顶”）。<br>- **数据导出**：支持通过筛选条件导出全部查询结果，用于运营溯源与追责。<br>|
|<font color=”#4e73ff”>**官方发布**</font>|（见demo）|- <font color=”#4e73ff”>**新增模块**</font><br>- **功能定位**：支持运营使用官方马甲号，在指定分区的”官方”Tab下发布动态，发布后带自定义身份标签<br>- **列表页**：进入后展示已发布动态列表（ID/封面/标题/分区/发布人/身份标签/状态/发布时间/操作）。顶部筛选区支持按标题/分区/状态检索<br>- **新建弹窗**：<br>    - 发布人昵称（默认”盖世游戏官方”）<br>    - 身份标签：下拉选择（数据来源于”身份管理”模块已配置的标签）<br>    - 发布到分区：下拉选择<br>    - 关联文章ID（选填）：输入文章ID后点击”读取”，自动填充标题<br>    - 动态标题（必填，可手动输入或通过文章ID读取）<br>    - 正文内容（富文本编辑器，支持加粗/斜体/下划线/列表/插图/链接）<br>    - 发布方式：立即发布 / 定时发布（选定时后出现时间选择器）<br>    - 是否置顶：checkbox，默认不勾选<br>- **编辑弹窗**：点击列表”编辑”按钮弹出，回填所有字段。额外增加”状态”下拉（已发布/已下架/已置顶），支持修改状态<br>- **预览弹窗**：点击”预览”弹出深色背景模拟前端展示效果（头像+昵称+身份标签+时间·分区·官方+标题+正文+互动栏）<br>- **删除**：点击”删除”弹出二次确认，确认后从列表移除<br>- **前端展示联动**：通过官方发布的动态在前端社区的”官方”子Tab下展示，带对应身份标签<br>- **异常处理**：标题或正文为空时拦截发布并提示；文章ID不存在时提示”未找到该文章ID”//2026.5.26修改|
|<font color=”#4e73ff”>**内容发布（改版）**</font>|（见demo）|- <font color=”#4e73ff”>**V2.1改版**</font>：原”官方发布”升级为”内容发布”，兼容冷启动阶段运营日常在各板块快速发布内容的场景<br>- **变更点**：<br>    - Tab名称由”官方发布”改为”内容发布”<br>    - 身份标签由必填改为选填（新增”不使用身份标签”选项），运营日常发帖不需要带标签<br>    - 新建/编辑弹窗标题改为通用的”新建动态”/”编辑动态”<br>    - 列表中无标签的动态显示”-”<br>- **国内/海外均可用**：海外后台同步增加该模块<br>- **其余逻辑不变**：富文本编辑器、关联文章ID、定时发布、置顶等功能保持不变//2026.5.27修改|
|<font color=”#4e73ff”>**黑名单管理（新增）**</font>|（见demo）|- <font color=”#4e73ff”>**新增模块**</font>，国内/海外后台均可用<br>- **模块结构**：三个平铺Tab（IP封禁 / 关键词过滤 / 处罚记录）<br>- **IP封禁**：<br>    - 支持封禁单个IP或IP段（如10.0.0.0/24）<br>    - 处罚对象（平铺单选）：针对动态 / 针对人<br>    - 针对动态：删帖 / 静默（平铺单选）<br>    - 针对人：禁止发帖，时长平铺选择（1天/3天/7天/30天/永久/自定义天数）<br>    - 列表字段：ID、IP地址/段、封禁原因、处罚对象、触发动作、封禁时间、状态、操作人、操作<br>- **关键词过滤**：<br>    - 支持精确匹配/模糊匹配/正则匹配（平铺单选）<br>    - 处罚对象（平铺单选）：针对动态 / 针对人<br>    - 针对动态：删帖 / 静默（平铺单选）<br>    - 针对人：禁止发帖，时长平铺选择（1天/3天/7天/30天/永久/自定义天数）<br>    - 列表字段：ID、关键词、匹配模式、处罚对象、触发动作、触发次数、添加时间、状态、操作<br>- **处罚记录**：<br>    - 手动处罚入口，处罚对象（平铺单选）：针对人 / 针对动态<br>    - 针对人：输入UID，选择禁止发帖(周期/永久)，周期可选天数或自定义<br>    - 针对动态：输入动态ID，选择删帖/静默<br>    - 列表字段：ID、用户、处罚类型、处罚原因、触发规则、开始时间、结束时间、状态、操作<br>- **交互规范**：所有选项均为平铺radio样式（带边框高亮选中态），不使用下拉<br>- **触发动作仅保留**：删帖、静默（移除拦截和标记审核）//2026.5.27修改|
|<font color=”#4e73ff”>**发帖风控：手机号绑定（新增）**</font>|（见demo截图）|- <font color=”#4e73ff”>**新增前置校验**</font><br>- **合规背景**：国内社区类功能需满足”前端自愿后台实名”的风控管理规定，要求论坛类功能经营方至少有用户实名的可追溯线索（手机号绑定）<br>- **触发时机**：用户点击发帖按钮（FAB”+”号）或转发时<br>- **校验逻辑**：检测当前用户是否已绑定手机号<br>    - 已绑定：正常进入发帖页<br>    - 未绑定：拦截进入发帖页，弹出手机号绑定弹窗<br>- **绑定弹窗UI**（深色风格，居中模态）：<br>    - 标题：”面换绑定手机号”<br>    - 说明文案：”输入新的手机号并验证即可完成修改”<br>    - 手机号输入框：左侧”+86”前缀 + 竖线分隔 + 输入区<br>    - 验证码输入框：左侧输入区 + 右侧蓝色”获取验证码”按钮<br>    - 底部蓝色渐变”绑定”按钮（圆角胶囊样式）<br>    - 右上角”×”关闭按钮<br>- **校验规则**：手机号不足11位时提示”请输入正确的手机号”；验证码为空时提示”请输入验证码”<br>- **绑定成功后**：关闭弹窗，toast提示”手机号绑定成功”，用户可正常发帖//2026.5.27修改|
|<font color=”#4e73ff”>**发帖风控：防刷屏（新增）**</font>|（见demo）|- <font color=”#4e73ff”>**新增限制规则**</font><br>- **规则**：新用户（注册3天内）单日发帖数量限制，每天最多发5条<br>- **触发时机**：用户点击发帖按钮时，在手机号校验通过后进行发帖次数校验<br>- **超限反馈**：toast提示”新用户每天最多发布5条动态”，拦截进入发帖页<br>- **计数范围**：包含普通发帖和转发，均计入当日发帖数<br>- **重置周期**：每日0点重置计数//2026.5.27修改|

**操作日志表格：**

|**操作类型**|**参数 \(Parameters\)**|**参数的获取方式**|**操作详情示例文案**|
|---|---|---|---|
|**新增分区**|分区名称, 分区ID|提交表单时输入的分区名称，以及后端成功入库后返回生成的全局唯一分区ID。|新建了游戏分区 \[黑神话：悟空\]，分区ID: PT10003|
|**复制分区**|源分区ID, 新分区名称, 新分区ID|点击“复制”时绑定的源数据ID，表单提交的新名称，以及后端返回的新ID。|复制了分区 \[PT10002\]，并新建了分区\[GTA 5\_Copy\]，分区ID: PT10005|
|**修改分区**|分区ID, 变更字段名, 旧值, 新值|打开编辑弹窗时缓存旧数据，点击“保存”时通过前端 Diff 或后端比对获取发生变更的字段。|修改了分区 \[PT10004\] 的基础配置，状态由 \[正常\] 变更为 \[隐藏\]|
|**删除分区**|分区名称, 分区ID|点击列表“删除”按钮时，绑定获取当前所在行的数据对象。|删除了空分区 \[空分区测试\]，分区ID: PT10004|
|**导出分区数据**|分区名称, 查询开始时间, 查询结束时间|当前处于的分区详情页上下文变量，以及顶部时间组件选中的起止时间值。|导出了分区 \[GTA 5\] 在\[2026\-03\-12 00:00 至 2026\-03\-12 23:59\] 的数据指标|
|**新增身份**|身份名称, 身份ID|提交表单时输入的标签名称，以及后端成功入库后返回的身份ID。|新建了身份标签 \[官方认证\]，身份ID: ROLE\_001|
|**复制身份**|源身份ID, 新身份名称, 新身份ID|点击“复制”时绑定的源数据ID，提交的新名称，以及后端返回的新ID。|复制了身份\[ROLE\_001\]，并新建了身份标签 \[版主\]，身份ID: ROLE\_005|
|**修改身份**|身份ID, 变更字段名, 旧值, 新值|编辑保存时对数据模型进行前后比对（重点监控“权限内容”数组和“状态”的变更）。|修改了身份标签\[ROLE\_002\]，权限内容由 \[身份标识\] 变更为 \[身份标识, 置顶\]|
|**删除身份**|身份名称, 身份ID|点击列表“删除”按钮时获取当前行数据。|删除了身份标签 \[废弃旧标签\]，身份ID: ROLE\_004|
|**新增人员**|用户UID, 身份名称, 身份ID|弹窗中输入的“用户UID”，以及点击操作时所在行的身份上下文。|为用户 \[UID\_99214\] 下发了身份标签\[知名创作者\] \(ROLE\_002\)|
|**撤销身份**|用户UID, 身份名称, 身份ID|在二级人员详情页中，点击“撤销身份”时绑定的行UID与当前页面的身份上下文。|撤销了用户 \[UID\_44512\] 的身份标签 \[知名创作者\] \(ROLE\_002\)|
|**导出人员详情**|身份名称, 查询开始时间, 查询结束时间|当前人员详情页的身份名称上下文，及顶部时间筛选器选中的值。|导出了身份标签 \[官方认证\] 在\[2026\-03\-12 00:00 至 2026\-03\-12 23:59\] 期间的人员数据|
|状态干预<br>\(静默/删除/恢复\)|动态ID, 干预动作|点击操作项时绑定的具体动作类型枚举（如 Silence, Delete, Restore）以及该行数据的动态ID。|将动态\[D88204\] 的状态修改为 \[静默\]|
|**解除干预**|动态ID, 干预动作|点击“解除静默”或“恢复”时获取。|解除了动态 \[D88204\] 的静默状态，恢复为正常|
|排序干预 \(置顶/取消\)|动态ID, 干预动作|触发“置顶”或“取消置顶”时绑定的动态ID。|将动态 \[D88201\] 设置为全网置顶|
|**批量操作**|动态ID数组, 执行动作, 生效总数|读取当前列表勾选框（Checkbox）状态为 checked 的对应动态ID集合，并计算 Array\.length。|批量静默了 5 条动态，包含动态ID:\[D88201, D88202, \.\.\.\]|
|**导出动态数据**|筛选条件集合 JSON|点击“导出数据”按钮时，抓取当前顶部搜索栏（分区/时间/状态）所有生效的 Value 值。|导出了动态数据，当前条件：分区\[全部\]、语言\[中文\]、状态\[已静默\]|
|**新增热门话题**|话题内容, 话题ID|表单提交输入的话题内容（带\#号），以及后端入库生成的话题ID。|新建了热门话题 \[\#发现好游戏\#\]，话题ID: TOPIC\_1001|
|**动态状态变更**|动态ID, 操作动作|点击操作列/批量操作时获取的对应动态ID数组，及触发的具体按钮名称（静默、删除、审核通过等）。|将动态 \[D88201\] 的状态由疑似待审核变更为 \[审核通过\]|
|**动态加精/置顶**|动态ID, 操作动作|点击“置顶/取消置顶”、“加入精选/取消精选”时获取的动态ID。|将动态 \[D88202\] 设置为全局 \[置顶\] 及 \[精选\]|
|**数据导出**|操作模块名, 筛选条件|点击“导出数据”时，获取当前的页面模块名称以及生效的 Filter 筛选参数组合。|导出了 \[动态管理\] 数据，包含 842 条记录|
|`举报管理`|举报ID，操作动态|点击判定违规并执行操作时候记录结果|`判定违规，执行操作: 删除动态，禁发用户 3 天`|

## 4\.4 非功能需求

|**需求类型**|**详细要求**|
|---|---|
|**性能**|1\. **启动与切换速度**：竖版/横版冷启动与状态切换响应时间不超过 1s，无明显白屏。<br>2\. **流畅度**：页面上下滚动、左右侧滑面板拉起、Tab切换等核心操作帧率稳定在 50fps 以上。<br>3\. **加载性能**：Feed流中的 `160px` 封面图必须采用懒加载，列表页数据分页请求，单次请求响应时间 \&lt;1s。|
|**兼容性**|1\. **操作系统**：支持 Android 9\.0 及以上；支持 iOS 13\.0 及以上。<br>2\. **屏幕适配**：需完美适配主流全面屏、刘海屏、水滴屏，确保顶部系统状态栏及右侧悬浮设置按钮不被刘海或系统手势区遮挡。<br>3\. **横屏适配**：需兼容主流掌机（如Steam Deck）的横屏分辨率（通常为 16:9 ），确保左侧信息区与右侧双列Feed流比例协调。|
|**用户体验**|1\. **一致性**：主态与客态的设计语言（如深色模式色值、圆角、字体层级）需保持绝对一致，降低用户认知成本。<br>2\. **无障碍与可访问性**：支持系统字体大小调节，关键信息（如Steam游玩时长）不因字体放大而导致布局错乱或文字重叠。<br>3\. **反馈**：所有用户高频操作（如点赞、关注、切换平台Tab、横竖屏切换）都应有 \&lt;=200ms 的及时视觉变化反馈。|



---

# 五、交付设计（数据分析与埋点设计）

## 5\.1 核心业务指标

- **流量与粘性监控：** 社区 DAU、平均停留时长（Session Duration）、横/竖屏使用比例。

- **互动与 UGC 漏斗：** 社区曝光 \-\&gt; 点击动态详情 \-\&gt; 产生互动（赞/转/评） \-\&gt; 成功发布动态。

- **经济闭环漏斗：** 任务曝光 \-\&gt; 任务完成（发放盖世币） \-\&gt; 商城曝光 \-\&gt; 确认兑换收银台调起 \-\&gt; 兑换完成 \-\&gt; 成功填入收货地址。



## 5\.2 埋点事件表

|**事件ID**|**事件名称**|**触发时机**|**关键参数**|
|---|---|---|---|
|community\_page\_view|社区页访问|进入社区首页或切换顶栏社区Tab时|`uid`, `current\_partition`|
|post\_click|动态点击|在动态流点击任意一张动态卡片|`post\_id`, `author\_id`, `partition`|
|post\_publish\_submit|发布动态|在发布面板点击右上角“发布”时|`has\_media`, `has\_share\_code`, `associated\_game`, `is\_forward`|
|post\_interaction|动态互动|点击点赞、收藏、评论发送按钮时|`post\_id`, `action\_type` \(like/fav/comment\)|
|user\_follow|关注用户|在详情页点击“关注/已关注”按钮时|`target\_uid`, `action` \(follow/unfollow\)|
|partition\_edit\_save|分区编辑完成|关闭偏好管理弹窗时|`selected\_partitions` \(array\)|

## 5\.3 埋点参数表

|**参数名 \(Parameter\)**|**类型**|**是否必填**|**参数说明**|**枚举值 / 示例 \(Enums / Examples\)**|
|---|---|---|---|---|
|**uid**|string|是|用户唯一标识ID（未登录传空或null）|`u882910`|
|**device\_id**|string|是|设备唯一标识码|`d8a3f9b\-xx`|
|**login\_status**|boolean|是|当前用户的登录状态|`true`, `false`|
|**screen\_orientation**|string|是|**当前屏幕方向**|`vertical`, `horizontal`|
|**current\_page**|string|是|当前所在页面名称|`explore\_home`|
|**source\_page**|string|是|来源页面/上一级页面|`app\_launch`, `game\_detail`, `settings`|
|**stay\_duration**|number|是|页面停留时长（单位：秒）|`120`, `30`|
|**scroll\_depth**|number|是|页面滚动深度百分比（0\-100）|`45`, `90`|
|**from\_mode**|string|是|切换**前**的屏幕模式|`vertical`, `horizontal`|
|**to\_mode**|string|是|切换**后**的屏幕模式|`vertical`, `horizontal`|
|**trigger\_source**|string|是|**触发切换的来源**|`button\_click`, `auto\_controller`, `popup\_confirm`, `setting\_lock`|
|**nav\_item**|string|是|底部导航栏项目名称|`explore`, `play`, `rank`, `library`, `me`|
|**tab\_name**|string|是|分类Tab显示的名称|`all`, `featured`, `action\_rpg`|
|**tab\_index**|number|是|Tab的排列索引（从0开始）|`0`, `1`, `2`|
|**section\_id**|string<br>|是|**版块唯一标识**（对应PRD各区域）|`top\_banner`, `ops\_recommend`, `hot\_recommend`, `platform\_hot`, `hot\_news`, `selected\_games`, `all\_games`, `search\_result\_list`|
|**section\_type**|string|是|版块展示样式类型|`carousel`, `list`, `grid`, `scroll\_h`|
|**banner\_id**|string|是|轮播图唯一标识ID|`bnr\_2025\_wukong`, `bnr\_summer\_sale`|
|**banner\_type**|string|是|轮播内容类型|`game`, `activity`, `topic`, `video`|
|**campaign\_id**|string|否|关联的营销活动ID|`cp\_summer\_sale\_2025`|
|**item\_id**|string|是|内容对象ID（游戏ID或资讯ID）|`game\_9527`, `news\_1024`|
|**item\_type**|string|是|内容对象类型|`game`, `news`, `video`|
|**position**|number|是|在当前列表/轮播/搜索结果中的位置序号|`1`, `2`, `3`, `10`|
|**content\_source**|string|否|内容推荐算法来源|`recommendation`, `editor`, `history`|
|**game\_source**|string|否|游戏运行来源平台|`Steam`, `PC`, `Mobile`, `Cloud`|
|**game\_tags**|string|否|游戏标签（多标签用逗号分隔）|`rpg,action,open\_world`|
|**destination**|string|否|点击后的跳转目标|`game\_detail\_page`, `webview`, `video\_player`|
|**search\_keyword**|string|是|**搜索关键词**（用户实际输入或点击的词）|`黑神话`, `Open World`, `Cyberpunk`|
|**search\_source**|string|是|**搜索触发来源**|`input\_text`, `history\_tag`, `hot\_tag`, `voice`|
|**result\_count**|int|是|**搜索结果总数量**|`15`, `0`|
|**has\_results**|boolean|是|**是否有结果**|`true`, `false`|
|**search\_latency**|int|否|搜索接口响应耗时（毫秒）|`200`, `450`|
|**popup\_id**|string|是|弹窗唯一标识|`pop\_controller\_switch`, `pop\_video\_nowifi`|
|**popup\_type**|string|是|弹窗功能分类|`system\_alert`, `guide`, `promotion`|
|**click\_type**|string|是|弹窗交互类型|`confirm`, `cancel`, `close`, `background`|



## 

# 六、来自功能上线后的更新

**上线后记录。**

| 时间 | 版本 | 变更人 | 主要变更内容 | 备注 |
|------|------|--------|------------|------|
| 2026.05.25 | V2.0 | 郑群超 | 导航改版+游戏圈重构+求助/攻略分类+置顶区 | 基于CTO会议结论 |

功能demo：社区2.0demo.html

