# 【Prd】《盖世游戏》社区游戏详情页改动需求

# 一、 版本信息

|**时间**|**版本**|**变更人**|**主要变更内容**|**备注**|
|---|---|---|---|---|
|2026\.3\.16|V1\.0|郑群超|创建文档||
|2026\.05\.25|V2\.0|郑群超|社区Tab子tab改版+置顶区+求助攻略标签+发帖"发布到"|基于CTO会议结论|

# 二、 功能概述

## 2\.1 需求背景

- 随着平台内容体量与玩家互动需求的提升，原有的游戏详情页与社区呈割裂状态。

- 本次改版旨在将“游戏详情”与“社区圈子”深度融合，并重构全局搜索与发帖链路，优化横屏设备下的空间利用率，缩短玩家查找游戏、获取攻略及发布动态的转化路径。



## 2\.2 设计目的

1. **深度融合展示**：实现详情与社区的 Tab 无缝切换，横屏设备下采用 50% 均分双栏结构，提升信息展现效率。

2. **搜索体验重构**：优化搜索结果的分发逻辑，强化横版游戏封面视觉（强制 16:9），精简多余冗余标题与按钮，增强“社区”维度的内容延展性。

3. **发帖路径提效**：强关联上下文场景，自动内嵌极简版分区卡片，并梳理底部发帖工具栏层级，增加游戏资产（配置分享）的流转。



## 2\.3 竞品分析

🌟 对标的竞品主要在信息架构、内容呈现形式和交互便捷性上提供了良好参考。

|**竞品**|**主要信息**|**关键结论**|**截图或视频**|
|---|---|---|---|
|\-|\-|\-|\-|

## 2\.4 名词解释

|**术语 / 缩略词**|**说明**|
|---|---|
|配置分享|用户在平台内导出的“启动方案”或“按键布局”方案，可在发帖时通过底部“配置分享”按钮导入贴文。|
|自动关联卡片|从特定专区唤起发帖面板时，系统自动在输入框下方生成的小型专区/游戏绑定标签。|

## 2\.5 功能范围

APP：盖世游戏

终端：安卓、IOS

# 三、 功能需求

## 3\.1 **功能列表**

|**序号**|**模块**|**功能描述**|**优先级**|
|---|---|---|---|
|1|游戏详情与社区融合页|包含游戏媒体区、信息区，以及详情/社区 Tab 切换|P1|
|2|全局搜索结果页|包含综合、游戏、社区、用户四大 Tab。游戏展示 16:9 横图网格，社区支持展开/收起。|P1|
|3|话题聚合页|包含话题信息，话题动态流，参与话题。|P1|

## 3\.2 功能详细说明

功能demo：[社区游戏详情页改动demo](https://gistcdn.githack.com/z36358631-ship-it/3a4e270de122db5764e98921d651bb7a/raw/c50209e3fb510d346483d17c1b95b8888cc06154/%E7%A4%BE%E5%8C%BA%E6%B8%B8%E6%88%8F%E8%AF%A6%E6%83%85%E9%A1%B5%E6%94%B9%E5%8A%A8demo.html) 

**系统与全局布局**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjFmZDhlMTAwZjdlNjlmYTM3NWUwOTU5M2JlNGZjMWVfYTAzZTRlM2Y5NTA5YzZhNDJhYzY5NTVjNTc3ZGJmYTRfSUQ6NzYxODg4NDc0OTYwODU1MzQyM18xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

#### 3\.2\.1 模块一：游戏详情与社区融合页 

**前置逻辑：**仅后台运营添加的游戏类型分区下才显示社交tab

1. **页面全局布局与自适应逻辑**

- **竖屏布局（Portrait）**：上下两部分结构。顶部为媒体展示及元信息区（随页面滚动上移），下方为详情/社区的滚动内容区。

- **横屏布局（Landscape）【重点改动】**：

    - **社区特例**：横屏状态下点击“社区圈子”Tab，为了保证信息流阅读体验，左右分栏取消，社区信息流 **100% 独立全宽展示**，不与游戏详情混排。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWEwNzk5NGEyZDk2ZjgxNzAwOWE2ODE4OWM5NWRmYTdfNTFkMGE4ODRlYjI1YjhmODBkNWI4ZmY2YmVkNzFkODVfSUQ6NzYxODg4NDgxNDk0MjM3NTA5M18xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

2. **顶部功能栏 \(Top App Bar\)**

- **返回按钮**：左侧，点击返回上一级。

- **Tab 切换**：居中展示【详情】、【社区圈子】。选中项字号放大至 17px，白色加粗，底部展示品牌色短划线（`width: 16px`）。

- **分享按钮**：右侧分享 Icon。切换至“社区”Tab 时 隐藏

3. **【详情】Tab 内容区:复用原有功能**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjFiNzVjM2U2ZTU5M2Y5MTZhMDk4MWIwMjczMTliNWFfMjgwZTVhNTI4ZGUyNjVhOTNiNWM2NmNiMGU2MWY4YTdfSUQ6NzYxODExNTcxMjA0MTgxNDk4NV8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

4. **【社区圈子】Tab 内容区**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODY0MGI2NTAyMzZhNjk1Y2EwMDI3ZWQzOTBiMGIwYThfYzdjNWMzMTY2YTc4MGYyOGQ5Zjc0MTQ2ZTQwZTBjMWVfSUQ6NzYxODg4Njk2NDQ4NjE2MzQwM18xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

- **顶部搜索入口**：固定吸顶的胶囊框，引导文案“社区内搜索”。点击唤起【搜索页】,在当前分区搜索

    - **搜索结果页：**定位至社区tab\-相关动态

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTM4ODkzYTM2OWZjMTlmMWQ2OGMwN2UzNzg1MjFkMjRfYWE1M2QyYTM3Y2E0NjRiYjAwYjA0ZjM4ODBlZGI2ZTJfSUQ6NzYxODg4NzM3Njk3NTQxNjU0OF8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

- **专区 Header**：展示游戏小图 \(48x48px\)、专区名称（加粗）、专区简介（最多 2 行截断）。右侧【加入】按钮，点击 Toast 提示“已加入该专区/已退出”，按钮状态同步反转。

- **子 Tab**：<font color="#4e73ff">**综合、官方、求助、攻略**</font>（原为综合、精选）//2026.5.25修改

    - <font color="#4e73ff">**综合**</font>：展示该分区全部帖子
    - <font color="#4e73ff">**官方**</font>：仅展示带官方身份标签的用户发布的帖子
    - <font color="#4e73ff">**求助**</font>：仅展示用户发帖时选择发布到：求助的帖子
    - <font color="#4e73ff">**攻略**</font>：仅展示用户发帖时选择发布到：攻略的帖子
    - **交互**：点击Tab实时筛选帖子列表，不影响分区header；切换时列表回到顶部
    - **异常处理**：无内容时显示空态当前分类暂无内容

- <font color="#4e73ff">**置顶区**</font>（新增）//2026.5.25修改

    - **位置**：专区Header和子Tab之间
    - **展示条件**：当前分区有置顶帖时才展示；全部Tab下不展示
    - **单条样式**：左侧橙色置顶标签 + 帖子标题（单行截断）+ 右侧灰色箭头
    - **交互**：点击整行跳转至该帖子详情页
    - **多条置顶**：支持多条，纵向排列
    - **异常处理**：帖子被删除后，置顶区自动移除该条；置顶帖为0时置顶区整体隐藏

- <font color="#4e73ff">**帖子标签展示**</font>（新增）//2026.5.25修改

    - **求助标签**：红色底白色字，展示在帖子标题文字前方。触发条件：用户发帖时选择发布到：求助
    - **攻略标签**：绿色底白色字，展示在帖子标题文字前方。触发条件：用户发帖时选择发布到：攻略
    - **官方标签**：品牌色底黑色字，展示在用户昵称右侧。触发条件：后台配置了官方身份标签的用户

    - **单列头部**：极简显示。左侧为发布人头像；右侧分两行（第一行为**加粗昵称**，第二行为**发布时间 · IP归属地**），统一在右侧最边缘增加 **”更多（···）”** 胶囊/图标按钮。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Yzc2YmJkNzUwYzAzMzkyNDBkNzEwZTQ0ZTFiOTYwMzFfZTljODMyOTJlOTVjM2U1YjczZjdiZTFiN2U4NTYyMDZfSUQ6NzYxODg4ODM3MzU1Mzk1ODA5NV8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

        - 点击**“更多（···）”**弹出气泡操作菜单（点击页面空白处收起），包含两项操作：

            - **【不感兴趣】（带隐藏Icon）**：

                - **交互逻辑**：点击后气泡菜单收起，系统**立刻在当前列表移除该条动态卡片**（前端本地 DOM 移除补位），同时屏幕底部弹出 Toast 提示：“`操作成功，系统将减少为您推荐此类内容`”。

            - **【举报内容】（带旗帜Icon ，红色警示色）**：

                - **交互逻辑**：点击后气泡菜单收起，从底部拉起半屏/居中的【举报动态】填写弹窗。

                **【举报动态弹窗 \(Report Modal\)】**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MGY4MzA5NmRiYjdhOWUyOTNmYWYyZGIzZmVmNjBiOGFfNmE1ZGQxZDNhNjYxYzg2ZGZkOTA1OTEwNjAzZDA1NDNfSUQ6NzYxODg1MzAxNTM1NzA5ODk2MF8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

                - **弹窗样式**：采用底部向上滑出的圆角模态面板，带有半透明黑色全局背景遮罩。

                - **页面构成与表单规则**：

                    - **动态标题**：顶部标题需动态读取当前被举报作者的昵称，格式拼接为：“`举报 @\[作者昵称\] 的动态`”。

                    - **举报原因分类（必选单选）**：

                        - 采用 4列 x 2行 的网格标签（Tag）平铺展示。

                        - 选项包含：`社区无关`、`色情低俗`、`辱骂/引战`、`盗版/作弊`、`违规交易`、`侵权/抄袭`、`涉嫌诈骗`、`其他`。

                        - 交互：点击标签实现单选（高亮主色），选中时有轻微缩放的点击动效。

                    - **补充说明（条件判定区域）**：

                        - **隐藏逻辑**：默认状态下，或选中前7个具体常规原因时，此输入框组件**隐藏**。

                        - **展开逻辑**：当且仅当用户选中 **“其他”** 标签时，下方平滑展开多行文本输入区域。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTZjODQ3YWVhY2YyMmRiODc2NmRjYjk3MDgzY2Y5ZTNfZDc0ZjdmM2QyNWUzODU5NjkyZWUxMmU4NmU0OTY2ZTVfSUQ6NzYxODg1MzIwNzY5NjcyMzE2NV8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

                        - **占位符**：“请输入详细说明（必填项）\.\.\.”。

                    - **图片证据（选填）**：预留 65x65 的“\+”号上传位，点击调用系统原生相册，支持用户上传截图取证。

                1. **提交校验与反馈**
                用户点击底部红色【提交】按钮时，需执行以下前端校验：

                - **校验 1（必选）**：若未选中任何“举报原因”标签，拦截提交并 Toast 提示：“`请先选择一个举报类型！`”。

                - **校验 2（必填补充）**：若当前选中了“其他”标签，且“补充说明”文本框为空（去除首尾空格），拦截提交并 Toast 提示：“`选择“其他”类型时，必须填写详细说明！`”。

                - **成功反馈**：所有校验通过后，前端关闭举报弹窗，并弹窗 Toast 提示：“`✅ 举报提交成功！感谢您协助维护社区环境`”。（同时向后端“后台\-举报管理”模块写入该条举报工单数据）。

- **信息流 \(Feed\)**：单列瀑布流排布。底部常驻悬浮 FAB（\+）发帖按钮，点击唤起【动态发布页】。

- **排序推荐规则：**

    - **按照热度分降序排列：**

        - **计算因子：**点赞数（正向权重）、收藏数（正向权重）、回复数（二级评论数量，含回复的回复，按总条数累计）、发布时间（新评论获得一定初始曝光，时间衰减因子）

        - **计算公式：热度分 = **\(动态点赞数 \* a \+动态收藏数 \* b \+ 动态回复数 \*c \) \* 时间衰减因子 \*分区系数

            |            **因子**|            **值**|            **说明**|
            |---|---|---|
            |            a|            1|            点赞的基础权重|
            |            b|            1\.5|            收藏代表有用或有趣，比点赞权重略高|
            |            c|            3|            回复数权重更高，因为回复代表更深度的互动|
            |            时间衰减因子 <br>            |            - 发布后前 24 小时：时间衰减因子 = 1\.0<br>            - 24\~72 小时：时间衰减因子从 1\.0 线性降至 0\.5<br>            - 72 小时以上：时间衰减因子 = 0\.5 × \(1 \- 0\.1 × 超过的天数\) （最低不低于 0\.1）|            |
            |            分区系数|            1\.5|            加入分区后，对应分区的动态进行分数加成|

    - **最新作品强插排序：**每10个作品中，找出当前时间最新的N条作品（N=3），确保它们出现在前2\-10位（随机不相邻的3位，比如第M = 2、5、7位）

- **空状态（缺省页）**：当前分区无内容时，居中展示线性SVG插画及文案“当前分区暂无动态”。

---

#### 3\.2\.2 模块二：全局搜索结果页

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzJlYTMyMWY1ZTIxNDgzNjljMzc3OTk1NDVhZjcyNWNfYTE4ODFiMjBiOGM2Njc4MzNmZDdlNzRhNjc4MzU2MTVfSUQ6NzYxODExNjAwOTI3MDk1NTIwM18xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

1. **基础框架**

- **触发与动效**：点击全局内搜索框唤起。全屏页面从右向左滑入覆盖（）。

- **头部搜索栏**：左侧返回键（点击滑出页面）；中间胶囊输入框（获取焦点时**默认全选**现有词汇，带有一键清空 `x` 按钮）；右侧【搜索】按钮

- **全局导航 \(Tabs\)**：等分展示 综合、游戏、社区、用户。点击进行内容 Pane 的切换。

2. **综合 Tab \(All Pane\)**

- **布局规范**：向下纵向罗列

- **游戏 Block \(最多 4 条\)**：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTU5NjUxNjU2N2IwOWE2ZGQ5YWYyNDQyMWZhMTgzYmVfYzRhMTY5MmMxMzNmMTA0NjBlYTkzYjg1YWNjMjEyYzVfSUQ6NzYxODExNjMzNTU3NTM3MDk0MV8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

    - **样式：**  封面图 \+ 名称 \+ 评分与标签 \+ 一句话简介。

    - **交互**：点击整条卡片关闭搜索页，跳转至游戏详情页；点击查看更多，跳转搜索结果页【游戏】tab

- **社区 Block \(最多 2 条\)**：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjhmNGNjNDEyMDc1NjdkN2IyNWUwMGNlMGU5YTQzNzBfMGMzZTE0OWYwNGU4ZmNkNzc1NDZiOWUxMmRjZGNkYzBfSUQ6NzYxODExNjQwODU3MjMxNjYyMV8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

    - **样式：** 60x60px 封面图 \+ 名称 \+ 社区简介。右侧带【\+ 关注】药丸按钮。

    - **交互**：点击整条卡片关闭搜索页，跳转至游戏详情页；点击查看更多，跳转搜索结果页【社区】tab

- **用户 Block \(最多 1 条\)**：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGI4YjFkYjk2OGNmZTdhNzgxMTI5ZDlmM2MzMTA2ODhfMzZhNGRhN2UxZjNlYzliZGM1ZDAwN2M4ZmNmNjg1YjdfSUQ6NzYxODExNjY3MDc5NjEwNjk0NV8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

    - **样式：** 48x48px 圆形头像 \+ 昵称 \+ 身份描述。右侧带【关注】按钮。

    - **交互**：点击整条卡片关闭搜索页，跳转至游戏详情页；点击查看更多，跳转搜索结果页【游戏】tab

- **相关动态 Block**：直接平铺包含关键词的图文/视频信息流。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjAzMjQxZmE1ZTczNWYyMzBiNzIwODUwZGU1NzJjMDJfNTM5YzJiMDdmZWM1MTQzNWU3NjIwODI2N2U1ZjNhZTdfSUQ6NzYxODExNjcyMTQ1MTMwNTk0OV8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

3. **游戏 Tab \(Games Pane\)**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjZhMmYyOTkxMDhjZmY2NTllYzQ1ZTE1OTQ0ZmQzODhfZjY0YzFjNTdmNTQ1ZmQ4NDc5ZWVkYzQxZTFhYzExYjdfSUQ6NzYxODExNjk0NDA0MjEwMTk1NF8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

- **二级分类标签**：横向流式排布，如“全部 175”、“PC游戏 2”等。

- **游戏网格 \(Game Grid\) **：

    - **排版列数**：竖屏 2 列，横屏 4 列展示。

    - **媒体自适应强制裁切**：所有游戏图片**强制渲染为 16:9 横图**。具体以UI稿为准

    - **卡片元素**：左下角压盖半透明黑色标签（如：热门、RPG）；下方标题单行截断；底部根据资产状态判定是否展示 Steam Icon 及“在游戏库中”标记。

4. **社区 Tab \(Community Pane\) 【重点改动】**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDU2NGY5YWQ5ZDMxYmY0NDBkZTgxNDJjMDQ0MmYzM2ZfNGU4N2U2NjRmMDA5OTQ1OGVkZDlhMTAxOTQ2YWY0MjRfSUQ6NzYxODExNzA1MTQ1MzkwMTc4Ml8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

平铺社区结果列表。

- **折叠/展开逻辑**：

    - **默认状态**：列表最多仅展示 **3 条** 社区。

    - **查看更多**：若总数据 \&gt;3 条，列表底部居中展示“查看更多 ∨”蓝色文字按钮。

    - **展开交互**：点击后向下无刷新展开全部社区结果，此时按钮文字变为“收起 ∧”。再次点击恢复至展示 3 条。

- **相关动态区**：紧随其后，包含“相关动态”标题及 Feed 流列表。

5. **用户 Tab **

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=N2E5MDQ3YjZjNzBlNTA3OGQxYjE1NjQzZWZmYzYzNzNfY2U4YmZlMjc2ODQ3MjM4MDQ0Yjk1ODJkNjQwZTU1NTNfSUQ6NzYxODExNzIzNDc1Nzg4MDc3NF8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

- **列表展示**：满屏展示检索出的用户列表。包含头像、昵称、说明及交互关注按钮。

---

#### 3\.2\.3 模块三：动态发布页

整体功能与社区首页发帖一致

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MWFmMWQ5MGNlOWRmMTZmNzM4ZmM0M2IxZDQ0NjBlNDhfMmUzZDA4MTQ3Y2FlNTIyMDY2ZTI1MmM1OWVlZmRhNWVfSUQ6NzYxODExNzU4MTM2NzUxMjAzMl8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

1. **页面唤起与布局**

- **触发时机**：在社区 Tab 下，点击右下角悬浮【\+】按钮。页面从右向左全屏覆盖滑入。

- **草稿回显逻辑**：

    - 点击主动发布入口时，系统需检测本地是否存在未过期的草稿数据。

    - **若有草稿**：页面加载时自动将草稿中的标题、正文文本、已关联的游戏、已插入的配置方案进行完整回显，并弹出 Toast 提示“已恢复草稿”。

    - **若无草稿**：展示干净的初始状态。

- 3\.3\.2 页面布局与输入区交互

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MjM0MTQwYmQ1MTM3MmJkMjNmZWJiM2EyNzc5NGQyM2RfNDIzYTllYjhjNTBjNTcyOTRhN2RjYmY4MmE1ZDE0YmJfSUQ6NzYxODQzNDU3NjI3NjUyMzk4M18xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ODFlN2RjNjhlNmE4OTJjZGQ2MzI2NTYwN2JiNDA3YmRfYjVkNTg2Zjk4ZmFmMWIwZmMxZGM4YjY1ZDVkZmQ1YzhfSUQ6NzYxODQzNDU3NTQwMTc4MjIxM18xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

- **顶部导航栏**：

    - 左侧：【返回】按钮（带向左箭头）。

    - 中间：标题（“发布动态” 或 “转发动态”）。

    - 右侧：【发布】主操作按钮（品牌色胶囊样式，文字加粗）。

- **标题输入区（仅主动发布可用）**：

    - 样式：大字号、加粗的单行输入框，占位符为“加个吸引人的标题”。

    - 交互：点击获焦，唤起系统/虚拟键盘。

- **正文富文本输入区**：

    - 样式：占位符为“分享你的游戏见解\.\.\.”。

    - **话题高亮交互（重点）**：该区域为富文本属性。当用户通过底部工具栏插入话题时，话题文本（如 `\#发现好游戏`）必须以**品牌蓝色（Primary Color）且加粗**的样式插入当前光标位置，视觉上向用户暗示该内容发布后具备点击跳转属性。

- **已关联数据展示区**：

    - 位于正文输入框下方，采用流式布局向下排列。

    - 当用户插入“关联游戏”或“配置方案”时，在此处生成深色带边框的横向数据卡片。

    - 当有用户插入“关联分区”时，在动态下方生成分区icon和名称

        - **关联分区规则**：

            - 若用户在“全部”、“关注”等综合Tab下发布，且未主动关联游戏，动态被归类为“分享/综合”分区。

            - 若用户在特定游戏Tab（如“GTA 5”）下发布，动态**自动继承**该游戏分区属性，且即使不主动关联分区，并增加提示文案“自动发布至该分区”，系统也会在动态详情页正文底部自动挂载该游戏专区的标签链接，选择分区选项不可点击。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmM0YzhiYzQ1ZDZmOWZhYjAxNzMxODgwMjdlMDAwZDRfNTc5MDA2YTM1ZTFkMWQ5ODcyZmRkMjVlMDI1YzA5MjlfSUQ6NzYxODQzNTEyMDk1MDc5MTEyNF8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

    - **卡片移除交互：**每张卡片最右侧带灰色`x` 关闭按钮，点击后立即移除该卡片，输入区布局自动上移补位

##### 1、底部工具栏与扩展功能交互

底部固定于屏幕下方（键盘弹起时随键盘上推），自左向右包含以下功能：

1. **图片/视频选择（Icon）**

    - **交互**：点击唤起原生系统相册（或自定义媒体选择器）。

    - **规则**：最多支持选择 9 张图片或 1 段视频。选中后在正文下方生成缩略图矩阵，缩略图右上角带有红色 `x` 可删除。

2. **Emoji 表情（Icon）**

    - **交互**：点击后，收起默认打字键盘，从底部向上弹出包含常用 Emoji 的面板。

    - **状态切换**：若当前已是 Emoji 面板，再次点击则收起面板，恢复虚拟/系统键盘；点击输入框空白处也可随时唤起键盘并收起表情面板。

3. **插入话题（****`\#`**** Icon）**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmI0ODJlNWI5MTYyZjZhN2U1MmM3ZWFkNjU3YzJmODJfOGVmODJlNTI1YTU3MTk3OGI5MmZjMjEzYmEwZWE0ODZfSUQ6NzYxODQzNDkwNjkxODE5NDM2Nl8xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

    - **入口：**发帖时点击 `\#` 号触发全屏弹窗。

    - **搜索框**：顶部吸顶搜索栏。

    - **排序：**推荐话题\&amp;热门话题均按照浏览量降序排列

    - **弹窗功能**：顶部带搜索框支持搜索话题；下方展示“推荐话题”列表和“热门话题”列表（含话题名称与浏览量）。

        - **推荐话题：**后台人工配置的话题，显示话题名称，列表右侧带浏览量展示，显示规则为千\-\&gt;k，万\-w，展示，精确1位小数，最多展示10个，可带标签，如【活动】。

        - **热门话题：**按照浏览量降序排列的top10话题，**仅展示当前分区下的热门话题，如社区首页发布的，则是全站的热门话题**。

    - **插入动作**：点击任意话题列表项，弹窗关闭，正文输入框光标处自动插入蓝色高亮话题标签，并在末尾自动补充一个空格以便继续输入。

    - **交互**：点击列表任意项，弹窗关闭，发帖正文光标处自动插入蓝字高亮且不可拆分的 `\#话题名`。



4. **关联游戏（胶囊按钮）**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTkzNWQ2YTA5YzZhMjY3NTNiZmYzYTAzMDk0ZDgxMDRfNzU0MWJhYzQzYjVhNDcxZTI5ODA3MmM3Yjk3OWM0OTRfSUQ6NzYxODExOTE1MjYyMDQ1NzE4MV8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

    - **交互**：点击从右侧滑出全屏【关联游戏弹窗】。

    - **弹窗功能**：带搜索栏，下方以 A\-Z 首字母索引展示游戏列表（含封面、名称、评分、类型）。

    - **排他规则**：一条动态**最多只能关联 1 款游戏**。选中后弹窗关闭，底部展示区生成游戏资料卡片。若已有游戏，再次选择会**直接替换**原卡片。

5. **配置方案（胶囊按钮）**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTdlMzAwOTIyNDY0MjE0NmQ0ZGY3MDU2OWZkMTg2ZjJfNmY0ZWM0MGYzZDI5YzQwZGRhYzZhN2FhZDVmMDJhM2NfSUQ6NzYxODExOTE1MjEzODIyNjY1M18xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

    - **交互**：点击从底部向上弹起半屏动作面板（Action Sheet）。

    - **面板功能**：展示用户已云分享生成的“启动配置方案”与“按键布局方案”列表。

    - **插入动作**：点击任意方案，面板收起，并在底部展示区生成带有虚线边框与对应 Icon 的特殊配置卡片，Toast 提示“已插入配置方案”。

##### 2、特殊状态逻辑：AI标记与转发模式

- **AI 声明勾选**：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmM2NjAzZGY0ZGNkMmZkY2I2NDEyZmM2M2NkMDhiODVfNDUzZjA2ZmJmZTc2MzRhZjFmNWQ2N2RkYjAwNGQzNzJfSUQ6NzYxODExOTE1MjkxNDY5NzE2MF8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

    - 位于底部工具栏的正上方，展示文案“包含AI合成内容”

    - **交互**：点击整行区域即可切换勾选状态。勾选后，发布的信息流数据中将带上AI标记。动态底部增加”作者声明：内容由ai辅助完成”描述

- <font color="#4e73ff">**发布到功能**</font>（新增）//2026.5.25修改

    - **位置**：与包含AI合成内容checkbox**同一行**（左侧AI checkbox，右侧发布到选项）
    - **展示形式**：三个pill并排平铺（非下拉），单选关系
    - **选项**：
        - 全部（默认选中）：金色高亮
        - 求助：选中时红色高亮
        - 攻略：选中时绿色高亮
    - **发布后效果**：
        - 选中求助 → 发布后帖子标题前自动带红色求助标签
        - 选中攻略 → 发布后帖子标题前自动带绿色攻略标签
        - 选中全部 → 帖子无特殊标签
    - **交互**：点击切换，toast提示将发布到「XX」
    - **异常处理**：未选择任何选项时默认为全部；网络异常时保留选择状态不丢失


- **自动绑定社区卡片**：

    - **场景逻辑**：从某游戏社区（如 GTA 5）点击发帖时，输入区下方、工具栏正上方需**自动生成**一张对应的精简版关联卡片。

    - **极简卡片样式**：深蓝色半透明背景（`rgba\(40,125,250,0\.1\)`），圆角 12px 的紧凑型胶囊外观。内部左侧为极其微小的 Icon（14x14px），右侧跟随对应专区名称（字号 12px，品牌色）。

    - **解除关联**：卡片最右侧包含灰色的关闭图标 `x`。点击后该卡片即刻隐藏（`display: none`），解除系统自动绑定。

- **功能工具栏 \(从左到右严格排序\)**：

    - **左侧媒体与文本组件**（圆形线框 Icon）：

        1. **图片/视频选择**（功能复用社区首页发帖）

        2. **Emoji 键盘切换**（功能复用社区首页发帖）

        3. **插入话题 \#**（功能复用社区首页发帖）

    - **右侧功能选项卡**（胶囊状按钮，向右靠齐）：

        1. **【选择分区】**（原左侧移至此，功能复用社区首页发帖）

        2. **【关联游戏】**（用户**手动配置**，不在发帖时锁死，功能复用社区首页发帖）

        3. **【配置分享】**：用于插入游戏手柄按键配置或云游戏启动参数（功能复用社区首页发帖）。

##### 3、退出拦截与草稿交互

- **触发时机**：用户点击左上角【返回】按钮或执行物理返回手势时触发校验。

- **校验规则**：系统检查“标题”、“正文（富文本内容）”、“关联游戏卡片”、“关联配置卡片”中**任意一项是否非空**。

    - **若全为空**：直接退出，关闭页面。

    - **若存在内容**：拦截退出行为，并在屏幕中央弹出“二次确认 Dialog 弹窗”。

- **弹窗交互**：

    - 弹窗文案：“退出编辑 \- 是否保存当前编辑内容为草稿？”。

    - **点击【不保存】**：清空所有输入数据和关联卡片缓存，彻底关闭发布页。

    - **点击【保存草稿】**：将当前所有输入项及卡片信息序列化存入本地缓存，关闭发布页，并底部 Toast 提示“草稿已保存”。

##### 4、发布提交流程与数据流转

- **前置校验**：用户点击右上角【发布】按钮时，需校验内容是否达标。

    - 若标题、正文均为空，且未附加任何媒体/卡片，Toast 提示：“请输入内容后再发布”，中止流程。

    - **内容审核：**接入文本、图片和视频审核，文本违规直接提示**“文本/图片/视频涉及违规内容，请调整后再试”**

- **提交与反馈**：

    - 校验通过后，清空本地草稿缓存。

    - Toast 提示：“发布成功！”。

    - 发布页向右平滑滑出（收起），同时触发首页信息流容器滚动至最顶部（`scrollTo\(0,0\)`）。

#### 3\.2\.4 模块四：话题聚合页 \(Topic Page\)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGM2ZWUyMmVlMWI5NWM4MWNjZDFkZjUwMjJkNWUzMzZfY2Q3N2VmMTdkNzcwZDg3NWQ5ZjIzOTE5MjAxYjUzOTRfSUQ6NzYxODQyNDAzMzY1NTE5NjYzM18xNzc5NzYzOTU5OjE3Nzk4NTAzNTlfVjM)

- **入口：**通过动态列表或详情点击带有 `\#` 的话题标签弹出。

- **顶部头图**：话题首字母生成的Icon，右侧展示话题全称（如 `\#发现好游戏`），及浏览量、参与人数统计。带【参与讨论】按钮。

    - **交互：**点击参与讨论，拉起发帖页，并自动关联当前话题

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MTc2NjVlM2NjOGRkOTY3NzhhOTliZGVkNWZkYWZkMDBfNzVjOTY3MWQyOTIxMzAxMmZkZTZmNzY4MmI5NTg4OTJfSUQ6NzYxODQzMzU3MTkwODg2NTI0Nl8xNzc5NzYzOTU4OjE3Nzk4NTAzNThfVjM)

- **信息流**：下方平铺关联此话题的动态列表。

- **排序：**按照发布时间从新到旧排列

# 四、 非功能需求

> 可以列举产品营销需求、运营需求、财务需求、法务需求、使用帮助、问题反馈
> 
> 

|**需求类型**|**详细要求**|
|---|---|
|性能|1\. **动画流畅度**：所有侧滑浮层 \(`searchPage`, `publishPage`\) 采用 CSS3 `transform: translateX` 硬件加速，保证 60fps 不卡顿。<br>2\. **布局性能**：横屏状态下的 Flex 与 Grid 排列切换不引发严重的 DOM 重排。|
|兼容性|1\. **屏幕适配**：横竖屏切换时需依赖 JS `transform: scale` 与 CSS 媒体查询双重保障，确保刘海屏、安全区域（Safe Area）不遮挡内容。<br>2\. 支持 Android 9\.0 及以上；iOS 13\.0 及以上。|

# 五、 埋点需求

## 5\.1 埋点事件表

|**事件ID**|**事件名称**|**触发时机**|**关键参数**|
|---|---|---|---|
|`game\_detail\_view`|游戏详情页访问|进入游戏详情融合页，或执行横竖屏（方向）切换时|`game\_id`, `orientation`, `source`|
|`tab\_switch`|模块Tab切换|在详情主页切换“详情/社区圈子”，或在搜索页切换“综合/游戏/社区/用户”时|`page\_name`, `tab\_name`|
|`global\_search\_perform`|执行全局搜索|在搜索结果页点击键盘“搜索”或绿色“搜索”按钮时|`search\_keyword`, `search\_source`|
|`search\_result\_click`|搜索结果点击|点击搜索结果中的任意列表项（游戏卡片、社区、用户、动态）时|`item\_type`, `item\_id`, `position`, `search\_keyword`|
|`community\_list\_expand`|社区列表展开/收起|在搜索“社区”Tab下，点击“查看更多 ∨”或“收起 ∧”时|`action\_type`, `current\_count`|
|`publish\_partition\_edit`|发帖分区关联编辑|在发帖页，点击自动关联卡片的“x”删除，或点击“选择分区/关联游戏”时|`action\_type`, `target\_id`|
|`publish\_asset\_insert`|游戏资产插入|发帖时点击工具栏”配置分享”并成功选择时|`asset\_type`, `asset\_id`|
|<font color=”#4e73ff”>`sub\_tab\_switch`</font>|<font color=”#4e73ff”>三级sub-tab切换</font>|点击综合/官方/求助/攻略|`game\_id`, `sub\_tab\_name`|//2026.5.25修改
|<font color=”#4e73ff”>`pin\_post\_click`</font>|<font color=”#4e73ff”>置顶帖点击</font>|点击置顶区帖子标题|`post\_id`, `game\_id`|//2026.5.25修改
|<font color=”#4e73ff”>`publish\_to\_select`</font>|<font color=”#4e73ff”>发布到选择</font>|发帖时切换”发布到”选项|`publish\_target`(全部/求助/攻略)|//2026.5.25修改

## 5\.2 埋点参数表

|**参数名 \(Parameter\)**|**类型**|**是否必填**|**参数说明**|**枚举值 / 示例 \(Enums / Examples\)**|
|---|---|---|---|---|
|`game\_id`|string|是|当前游戏详情或关联游戏的唯一标识ID|`G\_271590`, `G\_1091500`|
|`orientation`|string|是|当前屏幕布局方向|`portrait`, `landscape`|
|`page\_name`|string|是|触发事件所在的页面层级|`game\_detail`, `global\_search`, `publish\_post`|
|`tab\_name`|string|是|切换后目标Tab的名称或索引标识|`detail`, `community`, `search\_all`, `search\_games`|
|`search\_keyword`|string|是|用户在搜索框实际输入的查询词|`荒野大镖客系列`, `黑神话`|
|`item\_type`|string|是|搜索结果中被点击的对象类型|`game`, `community\_partition`, `user`, `feed`|
|`position`|number|是|被点击内容在当前列表/网格中的排序位置|`1`, `2`, `4`|
|`action\_type`|string|是|描述具体的交互动作类型|`expand`, `collapse`, `remove`, `add`|
|`asset\_type`|string|否|发帖时插入的资产类型|`config\_launch` \(启动方案\), `config\_keymap` \(按键布局\)|



# 六、 验收标准

|**测试点**|**预期结果**|
|---|---|
|横版布局分流|切换横屏后，详情与社区 Tab 表现必须差异化。详情必须为 50:50 左右分栏；社区必须为 100% 独占空间分发。|
|搜索卡片重构|综合 Tab 的游戏列表必须没有“关注”按钮；游戏 Tab 的所有竖版封面图必须完美裁切为 16:9 横图比例，不出现拉伸变形。|
|社区列表折叠|搜索结果社区 Tab 下，默认展示 3 条，无标题；超数后出现“查看更多”，展开后文字正确更替为“收起”。|
|发帖逻辑解耦|发帖页展示极简的 GTA5 绑定卡片，且可关闭删除；底栏右侧严格按照“选择分区、关联游戏、配置分享”排布；占位符文案校验无误。|

# 七、 美术需求

|**序号**|**页面/模块**|**美术需求与设计要点**|**关键文案/状态**|**说明**|
|---|---|---|---|---|
|1|详情页：横屏自适应分栏|**50%对半分左右布局**：左侧区固定（包含200px高媒体图\+底层元信息），右侧50%为独立滚动内容区。左右区均使用 `border\-radius: 16px` 及独立背景色 `var\(\-\-bg\-panel\)`，视觉上利用 `gap: 16px` 及底层深色背景进行模块切割。|\-|极大提升横屏状态下（如Pad或横屏游戏时）的空间利用率，信息呈现不割裂。|
|2|搜索页：游戏Tab 网格图|**强制 16:9 横图裁切**：由于后端素材多为竖版海报，前端需严格使用 CSS `aspect\-ratio: 16/9; object\-fit: cover;` 进行居中智能裁切，确保横竖屏切换时网格图片的绝对对齐。|在游戏库中（带有Steam小图标）|保证游戏列表的沉浸感与视觉统一性，避免竖图过长导致单屏信息量骤减。|
|3|搜索页：综合Tab 游戏列表|**视觉层级精简**：综合搜索下的游戏列表单条信息，**严格禁止出现右侧“关注”按钮**。|游戏名称、评分★ 9\.4|降低综合结果页的信息噪音，引导用户点击整体卡片跳入游戏详情。|
|4|发帖页：极简关联卡片|**紧凑型胶囊视觉**：背景采用半透明主色 `rgba\(40,125,250,0\.1\)`，边框 `rgba\(40,125,250,0\.3\)`，高度压缩至24px。左侧Icon极小化处理 \(14x14px, 圆角4px\)，右侧搭配灰色 `x` 移除控件。|GTA 5 官方专区|通过弱化UI体积但保留品牌色的方式，做到“强提醒、弱干扰”。|



