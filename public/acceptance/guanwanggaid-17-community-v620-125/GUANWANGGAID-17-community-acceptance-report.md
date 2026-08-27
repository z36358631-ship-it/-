# GUANWANGGAID-17 社区功能验收问题（补测终版）

> 验收范围：V6.3.0 社区首页、游戏详情社区、我的/个人主页。  
> 实装包：GameHub 6.2.0（125）；测试环境；USB 真机 NX729J（Android 15）为主，MuMu DCO-AL00（Android 12）仅作辅助交叉。  
> 覆盖范围：Official 简体中文；Global 简体中文、英文、日语、巴西葡萄牙语、俄语；竖屏与掌机横屏。  
> 逐条结果：917条用例中通过314、失败61、阻塞542。当前共归并31个问题，P1=16、P2=15，无P0；结论为 **验收不通过**。  
> 截图均为无红框原图；含手机号、验证码、邮箱、UID或系统图库隐私内容的证据不公开。

| 模块 | 问题描述 | 期望表现 | 截图 | 提交人 | 优先级 | 指派给 | 状态 | 环境/机型 |
|---|---|---|---|---|---|---|---|---|
| 社区-帖子管理 | 官方帖仍能屏蔽、删除、移动板块 | 官方帖只展示置顶和禁言，前后端都要拦截其他管理操作 | ![官方帖仍展示多余管理项](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-01.png) | 郑群超 | P1 | 客户端/服务端 | 待处理 | 测试环境 / NX729J / Official / 管理员 |
| 社区-帖子管理 | 管理员操作项需要横向滚动，右侧操作被裁切 | 管理操作完整可见，不用左右试探 | ![管理员菜单横向溢出](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-02.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 管理员 |
| 游戏详情-社区 | 黑神话详情社区只有“全部、热门、综合”3个子Tab | 按需求展示完整子Tab，名称和顺序一致 | ![详情社区只有3个子Tab](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-03.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Global五语言 / 横竖屏 |
| 游戏详情-社区 | 横屏详情社区仍是单列布局 | 横屏按左侧Feed、右侧专区卡片和公告区分栏展示 | ![横屏详情社区仍为单列](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-03.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Global / 横屏 |
| 游戏详情-搜索 | 社区内搜索仍显示“搜索帖子 / Search posts” | 输入框显示“社区内搜索”及对应语言文案 | ![社区搜索文案不一致](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-04.png) | 郑群超 | P2 | 客户端/本地化 | 待处理 | 测试环境 / NX729J / Global / 中英日 |
| 游戏详情-发布 | 从黑神话详情社区发帖，没有自动带入游戏和分区 | 自动关联当前游戏和初始分区，不需要用户再次选择 | ![发帖未自动关联游戏和分区](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-05.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Global五语言 / 横竖屏 |
| 社区-发布 | 发布页没有“全部、求助、攻略”分类 | 展示3个发布分类，默认选中“全部”，支持单选切换 | ![发布分类缺失](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-05.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Global五语言 / 横竖屏 |
| 社区-发布 | 正文占位只写“分享你的见解” | 占位文案明确为“分享你的游戏见解...”及对应语言 | ![正文占位缺少游戏语义](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-05.png) | 郑群超 | P2 | 客户端/本地化 | 待处理 | 测试环境 / NX729J / Global五语言 |
| 社区-举报 | 举报原因只有5项 | 展示社区无关、色情低俗、辱骂/引战、盗版/作弊、违规交易、侵权/抄袭、涉嫌诈骗、其他8项原因 | ![举报原因只有5项](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-06.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Official、Global五语言 / 横竖屏 |
| 社区-举报 | 举报页看不到被举报人 | 标题展示“举报 @作者昵称 的动态” | ![举报标题缺作者](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-06.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official、Global五语言 / 横竖屏 |
| 社区-举报 | 举报使用全屏独立页，进入后丢失原帖上下文 | 使用统一模态弹层，保留原帖背景和关闭返回能力 | ![举报使用全屏页](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-06.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official、Global五语言 / 横竖屏 |
| 社区-游戏分区 | 黑神话分区简介显示无关小说正文，内容占满首屏 | 展示正确的游戏简介，并按需求限制行数 | ![黑神话分区简介错误](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-07.png) | 郑群超 | P1 | 后台/运营 | 待处理 | 测试环境 / NX729J / Official / 简体中文 |
| 社区-异常处理 | 断网刷新后持续显示骨架屏，没有失败提示和重试入口 | 请求失败后结束加载，展示错误说明和重试入口 | ![断网30秒仍是骨架屏](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-08.png) | 郑群超 | P1 | 客户端/服务端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 社区-资源加载 | Global黑神话专区图标持续加载失败 | 分区图标正常加载；失败时提供稳定兜底或重试 | ![Global黑神话图标加载失败](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-09.png) | 郑群超 | P2 | 资源/服务端 | 待处理 | 测试环境 / NX729J / Global五语言 / 横竖屏 |
| 搜索-多语言 | 相同关键词“Black Myth Wukong”在英文有结果，日语、巴葡、俄语无结果 | 不同界面语言使用相同关键词时返回一致的有效结果 | ![日语准确搜索无结果](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-10.png) | 郑群超 | P1 | 搜索/服务端 | 待处理 | 测试环境 / NX729J / Global / 英日葡俄 |
| 社区-多语言 | 切换语言后，当前专区页面仍残留上一种语言 | 语言切换后当前页立即刷新全部界面文案，不需要强杀重启 | ![切英文后仍残留俄语](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-11.png) | 郑群超 | P1 | 客户端/本地化 | 待处理 | 测试环境 / NX729J / Global / 英俄 / 横屏 |
| 社区-更多菜单 | 英文、巴葡、俄语的“不感兴趣/举报”被截断或从单词中间换行 | 操作文案完整显示，按单词换行，不影响识别 | ![巴葡更多菜单断词](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-12.png) | 郑群超 | P2 | 客户端/本地化 | 待处理 | 测试环境 / NX729J / Global / 英葡俄 / 横竖屏 |
| 社区-举报本地化 | 英文、巴葡、俄语举报页的必填/选填标识与正文紧贴，部分句子生硬 | 必填/选填标识与正文留出空格，文案符合对应语言表达习惯 | ![英文举报文案缺空格](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-13.png) | 郑群超 | P2 | 客户端/本地化 | 待处理 | 测试环境 / NX729J / Global / 英葡俄 / 横竖屏 |
| 社区-发布 | 横屏输入后退出发布页，草稿确认弹窗按钮被键盘遮住 | 弹窗出现前收起键盘，两个按钮保持可见可点 | ![草稿弹窗按钮被键盘遮住](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-14.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 横屏 |
| 社区-发布 | 发布成功后刷新列表看不到新帖，重启后才出现 | 发布成功后立即插入列表首位，刷新和重启状态一致 | ![发布后刷新看不到新帖](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-15.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 社区-评论 | 二级回复没有显示被回复人 | 展示回复对象，能看出具体回复谁 | ![二级回复缺被回复人](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-16.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 社区-分享 | 分享落地页缺互动数和“查看完整讨论”引导 | 展示点赞、收藏、评论、转发数据，并提供“查看完整讨论”卡片 | ![分享落地页缺互动和讨论引导](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-17.png) | 郑群超 | P1 | H5/服务端 | 待处理 | 测试环境 / NX729J / Official / 浏览器 |
| 社区-分享 | 帖子删除后分享链接直接显示404 | 展示内容已删除说明，并提供返回或打开App入口 | ![删除后分享链接404](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-18.png) | 郑群超 | P2 | H5/服务端 | 待处理 | 测试环境 / NX729J / Official / 浏览器 |
| 社区-手机号校验 | 11位非法手机号没有按格式拦截，直接提示“请先获取验证码” | 先校验手机号格式并提示“请输入正确的手机号” | 私有证据，不公开 | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 未绑定手机号账号 |
| 社区-验证码校验 | 合法手机号未填验证码时提示“请先获取验证码” | 按用例提示“请输入验证码” | 私有证据，不公开 | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 未绑定手机号账号 |
| 我的-消息 | 点击已删除帖子的消息后进入空白“帖子不存在”页面 | 在消息页提示“原动态已被删除”，不进入无效详情页 | ![删除态消息进入帖子不存在页](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-19.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 我的-资料 | 性别保存“保密”后重启变成“男” | 保存和重启后保持“保密”，不应变更隐私选择 | ![重启后性别变成男](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-20.png) | 郑群超 | P1 | 客户端/服务端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 我的-资料 | 只改昵称或简介也强制要求选择生日 | 修改其他资料时不强制补生日；如生日必填，应在进入页面时明确说明 | ![保存时强制要求生日](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-21.png) | 郑群超 | P1 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 我的-资料 | 历史默认简介原文重新保存提示非法字符 | 已存在的历史简介应允许原样保存，或进入编辑页时主动提示并给出修改位置 | ![历史简介无法原样保存](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-22.png) | 郑群超 | P1 | 服务端/审核 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |
| 搜索-游戏结果 | 黑神话同名结果有多条，只有第二条有社区入口 | 同一游戏数据合并或增加可识别信息，避免用户反复试错 | ![黑神话同名结果难区分](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-23.png) | 郑群超 | P2 | 产品/数据 | 待产品确认 | 测试环境 / NX729J / Global / 简体中文 / 横屏 |
| 游戏详情-帖子标签 | 求助、攻略各自Tab仍重复显示对应分类标签 | 分类标签只在综合Tab展示，求助和攻略Tab内不重复展示 | ![攻略Tab仍显示攻略标签](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-24.png) | 郑群超 | P2 | 客户端 | 待处理 | 测试环境 / NX729J / Official / 竖屏 |

## 补充截图

- 搜索-多语言，图2（巴西葡萄牙语无结果）：  
  ![巴葡准确搜索无结果](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-25.png)
- 搜索-多语言，图3（俄语无结果）：  
  ![俄语准确搜索无结果](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-26.png)
- 社区-多语言，图2（强杀重启后英文恢复）：  
  ![重启后英文恢复](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-09.png)
- 社区-发布，图2（收起键盘后按钮恢复）：  
  ![收起键盘后按钮恢复](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-27.png)
- 搜索-游戏结果，图2（第一个同名条目没有社区）：  
  ![第一个同名条目无社区](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-28.png)
- 搜索-游戏结果，图3（第二个同名条目有社区）：  
  ![第二个同名条目有社区](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-29.png)
- 我的-资料性别，图2（保存前为“保密”）：  
  ![保存前性别为保密](https://raw.githubusercontent.com/z36358631-ship-it/-/4b776b5c5287429cb663a9610fa7c74dbed946d9/public/acceptance/guanwanggaid-17-community-v620-125/images/img-22.png)

## 仍阻塞项

- 已真实完成发布、一级评论、二级回复、举报提交、删除、屏蔽、禁言、资料保存、分享落地页和普通/管理员权限对照；管理员权限重新配置后已再次强杀复验。
- 手机号发码成功并进入倒计时，但绑定接口不接受固定测试码；绑定成功、发帖续接和重启持久化仍需短信沙箱或绑定专用有效验证码。
- 头像裁剪、拖动、双指缩放、回填和退出不保存已在USB真机验证通过。
- 后台失败/并发Mock、服务端专项日志、性能、埋点、iOS与Android平板仍为阻塞。
- 《杀戮尖塔2》未证明配置社区分区，不再把缺社区/存档Tab列为本需求问题；视频单素材失败、评论草稿规则、分区清空后恢复默认分区和MuMu相册疑点均已从正式问题表移除。

## 最终基线

- 真机已恢复：`Official / 测试环境 / 简体中文 / 探索模式 / 竖屏`。
- 国服测试账号保持登录，管理员权限强杀重启后仍生效；最终基线证据为 [D247](../05-补测记录/D247_final_admin_baseline.png)。
- 本轮未推送Git、未生成公开图片地址、未发送飞书。
