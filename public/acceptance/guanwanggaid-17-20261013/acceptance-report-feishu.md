# GameHub 6.3.1 本轮验收报告（2026-10-13）

**当前结论：存在需求差异，整版不能判通过。共19项不同问题或待确认差异。Android真机与MuMu已执行局部流程；iOS没有实测；发行人灰度专项按要求跳过。**

包体：GameHub 6.3.1 (141)，构建时间2026-10-13 09:27:20。验收环境：Official／Global测试，NX729J Android15及MuMu Android12。功能清单标6.3.2、APK与用例标6.3.1，版本映射仍待确认。

## 最新用例结果

|状态|条数|
|---|---|
|PASS|16|
|FAIL|26|
|PARTIAL|67|
|待确认|3|
|BLOCKED|14|
|SKIPPED|9|
|NOT_RUN|513|

共648条。PASS仅表示已测端限定子项满足；PARTIAL表示仍有子项未验证；NOT_RUN为未执行。26条FAIL是用例数量，与19项合并问题不是同一口径。iOS仍639条阻塞、9条跳过、0条通过。

本轮续验31条：7条通过、12条部分完成、5条差异、1条待确认、6条阻塞。25条取得有效操作结果，6条目标流程阻塞（含准备尝试）。两条差异补充既有A08/A10，其余三条列为B01/B04/B05，避免重复计数。

## 九字段问题表

|模块|问题描述|期望表现|截图|提交人|优先级|指派给|状态|环境/机型|
|---|---|---|---|---|---|---|---|---|
|任务中心与兑换商城|**A01 积分商城展示京东e卡**<br>任务中心→兑换商城下滑，可见京东e卡100元/50元，价格19000/10000积分；MuMu与真机均复现。未尝试兑卡，不推断实际扣错资产。<br>复现／依据：我的→任务中心→兑换商城→下滑至京东卡；依据任务PRD 1.2、3.1.3。<br>关联：Sheet6:TC077|本商城不展示或配置京东卡；京东卡仅在发行人计划规定来源的盖世币范围处理。|![A01](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A01.png)|郑群超／Codex验收|P1|客户端／服务端／运营配置|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 + NX729J Android 15 / 竖屏|
|任务中心|**A02 每日／成长任务没有切换Tab**<br>每日与成长任务上下排列在同一长滚动列表；要找成长项需滚到下方。<br>复现／依据：任务中心从每日区滚至成长区；依据任务PRD 3.1.1。<br>关联：Sheet6:TC005|使用文字Tab切换，仅更新当前列表并保留另一Tab状态。|![A02](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A02.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|兑换确认|**A03 确认弹窗缺兑换前后余额与取消按钮**<br>虚拟商品确认仅商品、数字价格、数量、合计及确认兑换；无当前可用／兑换后余额，无“再想想”。右上关闭可用。<br>复现／依据：商城点击1积分云时长测试商品，仅打开确认；依据任务PRD 3.1.4。<br>关联：Sheet6:TC088|展示所需盖世积分、当前可用及兑换后余额；“再想想／确认兑换”明确操作。|![A03](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A03.png)|郑群超／Codex验收|P1|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|兑换记录|**A04 奖品记录缺订单号与消耗积分**<br>稳定记录仅“云游戏时长／兑换时间／已发放”；没有订单号、消耗积分。<br>复现／依据：任务中心→商城→我的奖品，等待稳定；依据任务PRD 3.1.5。<br>关联：Sheet6:TC106|展示商品名、兑换时间、订单号、消耗盖世积分与状态，便于核对和定位。|![A04](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A04.png)|郑群超／Codex验收|P2|客户端／服务端字段|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|兑换商城|**A05 商城资产说明及商品分类缺失**<br>顶端仅盖世积分与余额；无“仅可兑换本商城商品，不与盖世币合并”，商品全部混排，无分类。<br>复现／依据：从任务中心进入商城观察资产区和商品区；依据任务PRD 3.1.3。<br>关联：Sheet6:TC076, Sheet6:TC078|展示资产用途说明及“全部／虚拟权益／实物周边”分类。|![A05](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A05.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|兑换商城|**A06 余额不足商品缺原因文案**<br>余额2时100/200积分商品灰显；没有“积分不足”说明。这里只确认展示差异，不推断服务端拒绝失败。<br>复现／依据：低积分账户打开商城观察价格高于余额商品；依据任务PRD 3.1.3。<br>关联：Sheet6:TC082|余额不足商品显示积分不足，并禁止打开可提交兑换。|![A06](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A06.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|海外创作者|**A07 海外收益权益仍沿用国内发行人文案**<br>Global简体中文“收益分成”标题缺“仅受邀创作者”；副文案仍为“解锁发行人计划，提交作品获取收益”。<br>复现／依据：Global测试→简体中文→创作者中心；依据创作者PRD 10/12海外条款。<br>关联：SUP-CC-01|海外收益分成标明“仅受邀创作者”，副文案“提交作品获取收益”；不沿用国内解锁发行人计划承诺。|![A07](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A07.png)|郑群超／Codex验收|P1|客户端／运营文案|已复现；待处理|GameHub 6.3.1 (141) / Global测试 / MuMu Android 12 / 简体中文 / 竖屏|
|创作者实名认证|**A08 实名表单缺取消与指定提示**<br>点击去认证进入独立姓名／身份证整页；无“操作前请先完成实名认证”，无取消按钮；左上返回可以退出。真机与MuMu一致。 续验：真机空白表单同样没有取消入口，补充GS-CC-049。<br>复现／依据：创作者申请→去认证，停在空表；未输入或提交任何身份信息。<br>关联：Sheet4:GS-CC-045, Sheet4:GS-CC-046, Sheet4:GS-CC-049|按9/14条款保留指定提示、提交与取消；复用原认证弹窗结构需再对照原小米渠道样式。|![A08](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A08.png)<br>![B02](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/B02.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 + NX729J Android 15 / 竖屏|
|导入游戏|**A09 文件夹入口使用App自制目录页**<br>选择游戏文件夹授权后打开App目录页，XML包为com.xiaoji.egggame；真机同样打开MainActivity自制页。系统“所有文件访问”授权页不是系统文件夹选择器。<br>复现／依据：游戏库→导入→选择游戏文件夹→授权并返回；依据导入PRD图示03B及TC020。<br>关联：Sheet7:TC020|调用Android系统文件夹选择能力，不展示自制替代文件管理页。|![A09](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A09.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Global测试 MuMu Android 12 / Official测试 NX729J Android 15 / 竖屏|
|导入游戏|**A10 取消文件或文件夹选择直接退出添加弹窗**<br>MuMu海外从文件夹页左上返回，直接回空游戏库，没有恢复添加游戏弹窗。 续验：EXE页左上取消也直接回游戏库，需重新打开添加弹窗才能换Steam入口。<br>复现／依据：English文件夹页→左上返回；依据TC022及导入图示02异常处理。<br>关联：Sheet7:TC022, Sheet7:TC005|取消返回添加游戏弹窗，不触发扫描；任一路径失败可切换其他入口。|![A10](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A10.png)<br>![B03](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/B03.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Global测试 / MuMu Android 12 / English / 竖屏|
|自动扫描|**A11 扫描及选择页沿用旧结构**<br>真机扫描中只有动画／正在扫描，无实际扫描计数与取消；结果页“扫描完成”，取消一项后底部按钮不显示已选数量。<br>复现／依据：自动扫描→稳定11项结果→取消首项勾选；扫描中另见R055。未导入这些既有文件。<br>关联：Sheet7:TC011, Sheet7:TC012, Sheet7:TC029|扫描展示实际目录、文件夹数和游戏数及取消；结果进入共用选择并导入页，底部数量随勾选更新。|![A11](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A11.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / NX729J Android 15 / 竖屏|
|任务多语言|**A12 葡语／俄语长文案挤掉进度计数**<br>MuMu540×960葡语游戏任务描述末尾省略，0/300不可见；俄语同样，部分互动进度也不可见。只能确认当前尺寸，未扩推所有设备。<br>复现／依据：Global→Português (Brasil)／Русский→任务中心；葡语127、俄语130。<br>关联：Sheet6:TC177|长文案可截断或换行，但进度／上限独立保留且可读。|![A12](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A12.png)|郑群超／Codex验收|P2|客户端|已复现；待处理|GameHub 6.3.1 (141) / Global测试 / MuMu Android 12 / 葡语、俄语 / 540×960竖屏|
|帮助中心|**A13 帮助入口顺序与需求图相反**<br>帮助中心显示在反馈&建议下方，真机与MuMu一致。<br>复现／依据：我的→设置查看底部入口；依据帮助PRD image.png，正文没有单独写先后。<br>关联：Sheet8:TC001|按当前PRD配图和TC001位于反馈&建议上方；若正式UI已改，应先同步基线。|![A13](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A13.png)|郑群超／Codex验收|P3|客户端／产品确认|已复现布局差异；基线待确认|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 + NX729J Android 15 / 竖屏|
|帮助文章|**A14 长标题在页头截断且正文无完整文章标题**<br>PC游玩指引页头使用长文章名被截断；正文从导航／正文开始，未单独展示完整文章标题。<br>复现／依据：帮助中心→PC游玩指引；依据帮助PRD image.png与TC003。<br>关联：Sheet8:TC003|按帮助PRD图示页头“帮助中心”，正文独立展示完整文章标题及导航；如正式稿改变应同步用例。|![A14](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A14.png)|郑群超／Codex验收|P2|客户端／产品确认|已复现内容可读性差异；基线待确认|GameHub 6.3.1 (141) / Official测试 / NX729J Android 15 / 竖屏|
|发行人玩法说明|**A15 规则未更新为完整资产说明**<br>玩法说明全文只有三段泛述；没有五个规定区域、固定结算兑换句及积分／充值／预算退回隔离规则。<br>复现／依据：发行人计划→玩法说明，滚动后仍相同三块；依据发行人PRD 3.1.2。与灰度专项无关。<br>关联：Sheet5:GS-PUB-017, Sheet5:GS-PUB-018, Sheet5:GS-PUB-019|五个规定区域；明确普通任务积分与盖世币分账，充值及其预算退回不可兑京东卡，仅发行任务结算奖励来源可兑。|![A15](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A15.png)|郑群超／Codex验收|P1|客户端／运营规则|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|发行人钱包|**A16 钱包资产隔离说明缺失**<br>钱包标题为发行人计划；商城副文案“可使用结算的盖世币兑换”，无规定的入口下资产隔离提示。零余额不能证明账务隔离正确。<br>复现／依据：发行人计划→钱包，稳定截图实际钱包而非文件名所称商城；依据发行人PRD 3.1.7。<br>关联：Sheet5:GS-PUB-146|标题我的钱包；仅参与发行任务并结算所得可兑换；入口下明确任务积分分账、充值盖世币不计入兑换余额。|![A16](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/A16.png)|郑群超／Codex验收|P2|客户端／运营规则|已复现；待处理|GameHub 6.3.1 (141) / Official测试 / MuMu Android 12 / 竖屏|
|创作者获赞入口|**B01 创作者获赞入口**<br>个人页点击获赞，打开中央统计弹窗，列动态点赞/评论点赞/收藏及我知道了。<br>复现／依据：本轮新增观察，面板形态需对照最终稿。<br>关联：Sheet4:GS-CC-021|按原GS-CC-021要求进入右侧二级列表；若最终正式设计保留统计弹窗，应同步此用例。|![B01](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/B01.png)|郑群超／Codex验收|P2|客户端／产品基线|已取证，待处理/确认配置|Android真机 / GameHub 6.3.1 (141) / Official TEST Android15|
|导入拒绝授权|**B04 导入拒绝授权**<br>不允许所有文件访问后返回空游戏库，再打开添加仍推荐自动扫描，没有提升文件夹入口。<br>复现／依据：本轮新增拒绝分支观察。<br>关联：Sheet7:TC009|拒绝授权后回添加弹窗并提升选择游戏文件夹，不越权扫描。|![B04](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/B04.png)|郑群超／Codex验收|P2|客户端|已取证，待处理/确认配置|MuMu / GameHub 6.3.1 (141) / Global TEST English Android12 540×960|
|积分规则配置|**B05 积分规则配置**<br>Global英文已发布可读内容为定义/获得查询/兑换/到期/售后，缺积分与盖世币区别、京东卡资格。<br>复现／依据：本轮新增积分规则内容观察；后台版本号尚不可核实。<br>关联：Sheet6:TC064|PRD3.1.6四段说明资产分账、不互换/合并、积分及充值币不可兑京东卡，发行任务结算币可兑。|![B05](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@d384b107b60778969a25e80b423b108c186649f5/public/acceptance/guanwanggaid-17-20261013/images/B05.png)|郑群超／Codex验收|P2|运营规则／客户端配置|已取证，待处理/确认配置|MuMu / GameHub 6.3.1 (141) / Global TEST English Android12 540×960|

## 待确认与未覆盖

- 创作者测试门槛粉丝≥1与PRD≥50、国内任务奖励50／3与PRD5／2、旧任务点赞统计时间、帮助页最终布局、Hindi后台16%及版本映射尚待确认，不能直接判断为生产代码缺陷。
- 后台可登录欢迎页，实际模块仍返回欢迎，原因未确定。剩余513条未执行，需要可访问测试模块、已实名专用账号、可重置任务／余额／订单、服务端时间／故障／日志工具及合法游戏、Steam和引擎样本。
- iOS需要Mac/iPhone连接与信任、Xcode识别及控制会话接入；Android结果不能复制为iOS通过。
- 仅核对测试积分前台流水与余额，未验证实际权益到账、账务原子性或幂等；未兑换京东卡、未提交实名认证、未执行真实付款或公开内容发布。
- 无效EXE文本可加入库，仅记录局部观察；未执行该文件，测试条目已移除。缺旧版基准，未计作本期回归缺陷。
- 截图和后取XML不是同一时刻；扫描过场图不冒充完成或取消结果。问题图片为已脱敏红框副本，采用固定Git提交的公开HTTPS地址。
