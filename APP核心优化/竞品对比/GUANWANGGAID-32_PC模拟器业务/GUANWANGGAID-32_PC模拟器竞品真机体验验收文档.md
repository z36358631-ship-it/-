# GUANWANGGAID-32｜安卓 PC 模拟器竞品真机体验验收文档

## 一、验收信息

| 字段 | 内容 |
|---|---|
| 任务 | GUANWANGGAID-32 竞品对比分析—PC 模拟器业务 |
| 验收日期 | 2026-08-17—2026-08-18、2026-08-20 |
| 验收设备 | nubia NX729J（红魔 8S Pro），Android 15，1116 × 2480 |
| 对比产品 | GameHub（盖世游戏）、233 乐园、GameNative |
| 统一样本 | 本地 EXE：Prodeus、Neon Abyss |
| 版本口径 | GameHub 6.1.2（124）；233 系统包 4.86.0.2-4868968 / 更新页 v4.86.92.1，PC 引擎 10.2.4-0；GameNative 核心走查 0.9.0，设备释放后仅确认已安装 1.1.1 |
| 验收目标 | 验证本地 PC 游戏从新手进入、导入、首次启动、二次启动到退出/异常恢复的真实默认路径，输出盖世可执行问题与借鉴点。 |
| 账号与支付边界 | 未执行真实付款、订阅、租号、账号绑定；未使用设备内已有 Steam 在线会话。 |
| 总体状态 | **本轮真机链路已完成。** GameHub 与 233 的 Prodeus、Neon Abyss 对比已完成；GameNative 仅保留 0.9.0 工具型路径事实，1.1.1 的登录后链路为 **未验证**。 |

## 二、验收口径

1. 所有可横向比较结论均来自同一 NX729J 真机、同一网络、同一批本地游戏文件；比较的是用户在各 App 默认路径下得到的结果，不是引擎实验室性能排名。
2. 仅到标题页或警告页记为“启动”；进入可接收输入的实际游戏场景才记为“可玩”。
3. 两款样本只能暴露游戏级、配置级问题，不能外推为全平台兼容率或 FPS 排名。
4. 纯新手复测仅做强制停止后启动；未清数据、未退出账号、未注册新账号。因此用于判断“首屏是否告诉用户第一步”，不等同于卸载重装后的全新账号首开。
5. 遇到登录、Steam 会话、支付或其他会改变既有账号状态的节点，停止操作并记录为“未验证”；不绕过、不代填、不推断补齐。
6. 版本、截图和日志只记录可见事实；策略判断、商业化判断均明确标注为建议或待验证。

## 三、验收结果汇总

| 平台 | 新手首屏与第一步 | 导入与游戏资产感 | Prodeus 默认路径 | Neon Abyss 默认路径 | 退出/恢复 | 本轮结论 |
|---|---|---|---|---|---|---|
| GameHub | 直接进入内容首页；没有把“我有本地文件 / Steam 或 Epic / 还没有游戏”分流为首个任务。 | 自动补全封面、中文名、简介、标签、发行信息、评分；游戏库资产感最强。 | 可启动；已准备环境后二次启动约 5 秒进入光敏警告页。 | 连续两次约 12—16 秒静默返回详情；日志 `returnCode=139`，但被记录为 `normalExit=true`。 | Prodeus 有明确退出入口和未保存风险提示；Neon 失败无原因、重试或恢复入口。 | **导入信息与成功后退出领先；启动确定性和异常恢复为 P0。** |
| 233 乐园 | PC 游戏页的“导入 PC 游戏”是最明确的首个动作。 | 通用图标和文件名，资产感弱；首次选择 EXE、安装 Bionic，成功后记住选择。 | 可启动。 | 首次约 10 秒到标题页、约 20 秒进入可玩场景；二次约 10 秒到标题页。 | 返回主要改变侧栏/遮罩，退出语义不清。 | **同一 Neon Abyss 文件可玩，证明该游戏×设备组合存在可运行路径；不等同于引擎全面领先。** |
| GameNative | 首次可见项目介绍/分享/Ko-fi；关闭后是“未知”“兼容”等技术型列表，新手理解成本最高。 | 0.9.0 搜索失败生成 Unknown 条目，需要手工设置 EXE、容器、Wine、语言、分辨率、音频。 | 未纳入同口径对比。 | 未纳入同口径对比。 | 1.1.1 登录后启动、存档、退出未获授权验证。 | **仅可借鉴高级参数的透明可编辑；不能参与当前版本完整排名。** |

### 核心结论证据

| GameHub：信息服务领先 | GameHub：默认启动失败 | 233：同文件进入可玩场景 |
|---|---|---|
| ![GameHub Neon Abyss详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/01-gamehub-neon-detail.png) | ![GameHub Neon Abyss返回详情](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/02-gamehub-neon-return.png) | ![233 Neon Abyss可玩场景](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/03-233-neon-playable.png) |
| 已补全中文名、简介、标签、评分等信息，但“PC 游戏引擎兼容性评价”为 `--`。 | 两次启动约 12—16 秒回到详情页，用户无失败状态与下一步。 | 安装 Bionic 后进入可接收输入的酒吧场景。 |

> **阶段结论：** GameHub 已把“这是什么游戏”做得最好，但还没有稳定回答“这台手机上能不能玩、失败后怎么办”。首期优先级应从继续丰富详情页转为启动确定性与异常恢复。

## 四、验收项明细

| 模块 | 验收项/关注点 | 操作步骤 | 期望结果 | 实际结果 | 状态 | 优先级 | 证据 | 备注 |
|---|---|---|---|---|---|---|---|---|
| 新手入口—GameHub | 首屏是否让零经验用户知道第一步 | 强制停止后启动，观察首屏与可见主动作 | 用户可判断自己是本地文件、Steam/Epic 还是无游戏，并得到对应第一步 | 直接进入“继续”、推荐游戏、游戏库等已有用户语义；没有回答“我有 PC 游戏文件时从哪开始”。 | 发现问题 | P1 | ![GameHub新手首屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e786449651971a969fe48a70c16464fa113cf03/public/prd/guanwanggaid-32-pc-emulator/20-novice-gamehub-home.png) | 复测未清数据，不代表全新账号首开。 |
| 新手入口—233 | 首屏主任务是否明确 | 强制停止后启动，观察第一屏与首个可执行入口 | 用户无需理解模拟器术语即可进入导入任务 | 直接进入 PC 游戏页；“导入 PC 游戏”是最明确动作，同时并列 Steam、Epic、设置。 | 完成（可借鉴） | P1 | ![233新手首屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e786449651971a969fe48a70c16464fa113cf03/public/prd/guanwanggaid-32-pc-emulator/21-novice-233-home.png) | 不照搬预填搜索词和密集频道。 |
| 新手入口—GameNative | 首屏技术信息是否先于核心任务 | 强制停止后启动，关闭首次可见提示，观察首页 | 首要任务不应被捐赠或技术指标抢占 | 首先出现项目介绍/分享/Ko-fi；关闭后是“全部 / Steam”、Unknown、兼容等技术型列表。 | 发现问题（竞品） | P2 | ![GameNative新手首屏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@4e786449651971a969fe48a70c16464fa113cf03/public/prd/guanwanggaid-32-pc-emulator/22-novice-gamenative-home.png) | 可保留本地文件、Steam、添加游戏的分组，不宜直接复刻首屏。 |
| 导入—GameHub | 本地 EXE 导入后是否形成可识别的游戏资产 | 从游戏库选择本地 EXE，观察导入、游戏库与详情 | 自动识别游戏，并提供可用于启动决策的信息 | Neon Abyss 自动补全封面、中文名、简介、标签、开发商、发行日期、年龄评级、语言、评分；游戏库显示为正式卡片。 | 完成（优势） | P1 | ![GameHub导入信息](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/06-gamehub-neon-import.png)<br>![GameHub游戏库](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/07-gamehub-library-neon.png) | 元数据应继续服务于兼容性解释与推荐，而不止内容展示。 |
| 导入—233 | 首次配置是否在成功后复用 | 扫描目录、首次启动选择 EXE，再次启动观察是否重问 | 首次必要选择完成后，成功路径应被记住 | 导入列表使用通用图标与文件名；首次约 5 秒出现 EXE 选择并自动选中 `NeonAbyss.exe`，二次启动不再询问。 | 完成（可借鉴） | P0 | ![233 Neon导入列表](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/04-233-neon-imported-list.png)<br>![233 Prodeus扫描结果](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/08-233-prodeus-scan-result.png) | 借鉴“成功后记忆”，不照搬文件管理器式资产呈现。 |
| 导入—GameNative 0.9.0 | 低置信度游戏是否能被普通用户处理 | 搜索 Prodeus、Neon Abyss，进入 Unknown 条目并查看配置 | 默认路径应避免要求小白理解底层参数 | 搜索均为 0 结果；出现 Unknown/最近拷入文件，需手工确认 EXE、容器、Wine、语言、分辨率、音频。 | 发现问题（竞品） | P2 | ![GameNative Unknown条目](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/09-gamenative-unknown-detail.png)<br>![GameNative容器配置](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/10-gamenative-container-settings.png) | 只适合作为高级模式参考；不能外推至 1.1.1。 |
| 启动—Prodeus | 两个平台是否能完成基础启动与环境复用 | 各自从已导入游戏启动；完成后再次启动 | 到达可识别游戏页，并验证已准备环境不重复阻塞 | GameHub 与 233 均可启动；GameHub 二次启动约 5 秒进入光敏警告页。 | 完成 | P2 | ![GameHub Prodeus标题页](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/11-gamehub-prodeus-title.png)<br>![GameHub Prodeus二次启动](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/12-gamehub-prodeus-warm-start.png)<br>![233 Prodeus运行](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/13-233-prodeus-running.png) | 说明差异是游戏级、配置级，不能做平台级绝对胜负。 |
| 启动—GameHub Neon Abyss | 默认配置失败是否被正确识别并可恢复 | 连续两次按默认路径启动，记录时长、落点与运行日志 | 失败必须被识别为异常，并给出原因、已尝试方案与下一步 | 两次均在约 12—16 秒后回到详情；日志为 `returnCode=139`，却记录 `normalExit=true`；用户端无失败原因、重试或替代方案。 | 失败 | P0 | ![GameHub环境检查](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/14-gamehub-neon-environment-check.png)<br>![GameHub12秒返回](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/15-gamehub-neon-return-12s.png)<br>`evidence/07-logs/gamehub-neon-returncode-139.log` | 当前最直接的“点开就能玩”阻断。 |
| 启动—233 Neon Abyss | 同一文件是否存在可玩路径，首次组件准备是否可见 | 选择 EXE，完成 Bionic 安装，进入实际场景；强制停止后再次启动 | 达到可接收输入的场景；成功选择可复用 | 首次约 10 秒到标题页、约 20 秒进入酒吧可玩场景；二次约 10 秒到标题页；Bionic/Loading 进度可见。 | 完成（竞品事实） | P0 | ![233 Bionic就绪](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/16-233-neon-bionic-ready.png)<br>![233 Neon可玩场景](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/03-233-neon-playable.png) | 仅证明 233 当前默认方案在该游戏×设备组合有效，不代表其引擎性能全面领先。 |
| 退出—GameHub | 成功游戏的退出风险是否可见 | Prodeus 游戏内打开侧栏并点击退出 | 退出动作明确，并在可能丢失进度时提示风险 | 侧栏提供明确“退出”；退出前提示未保存数据可能丢失。 | 完成（优势） | P1 | ![GameHub游戏内侧栏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/17-gamehub-sidebar.png)<br>![GameHub退出确认](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/05-gamehub-exit-confirm.png) | 需补齐 Neon 这类异常退出的同口径状态与恢复。 |
| 退出—233 | Android 返回、侧栏、退出的语义是否清楚 | 在 Neon Abyss 内触发侧栏与 Android 返回 | 用户应区分“关闭遮罩/返回”与“退出游戏” | 返回键主要改变侧栏/遮罩状态，未观察到与 GameHub 同等明确的退出动作和风险确认。 | 发现问题（竞品） | P2 | ![233游戏内侧栏](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/18-233-sidebar.png)<br>![233返回键响应](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@75a104bb07793ffc912fbde9b36983db9fa3ce54/public/prd/guanwanggaid-32-pc-emulator/19-233-neon-back-response.png) | 不应照搬。 |
| GameNative 1.1.1 | Steam、登录后启动、存档、退出与商业化链路 | 仅确认系统包版本；发现设备已有 Steam 在线会话后停止 | 未获授权的账号会话不得使用，不将旧版事实外推新版 | 1.1.1 已安装，未进入已有 Steam 会话；上述链路均未验证。 | 未验证 | P1 | `evidence/01-baseline/package-versions-2026-08-18.txt` | 不参加当前完整排名。 |

## 五、问题清单

| 编号 | 问题 | 影响 | 优先级 | 当前建议 |
|---|---|---|---|---|
| G32-A01 | Neon Abyss 默认配置两次返回详情，`returnCode=139`，同机同文件在 233 可进入可玩场景。 | 用户无法完成核心任务；兼容性承诺失去可信度。 | P0 | 复现并定位 Wine、GPU、启动参数差异；对同一游戏接入候选配置 A/B/C。 |
| G32-A02 | 非 0 返回码仍记为 `normalExit=true`。 | 污染启动成功率、失败归因和后续兼容性推荐数据。 | P0 | 区分主动退出、异常退出、系统终止；未达到 game loaded 的异常不得记为正常退出。 |
| G32-A03 | 启动失败后静默回详情，没有原因、已尝试方案、重试、切换或替代入口。 | 用户只能盲目重试，放大历史高频启动点击与流失。 | P0 | 显示失败阶段、简化原因、已尝试方案和下一步；自动尝试候选配置时保留取消能力。 |
| G32-A04 | 游戏详情的元数据完整，但本机兼容性为 `--`。 | 用户知道“这是什么”，却仍无法判断“能不能玩”。 | P0 | 统一为“本机一键可玩 / 需要配置 / 暂不建议本地运行 / 待验证”；状态只由真实机型与配置样本生成。 |
| G32-A05 | 首屏没有按本地文件、Steam/Epic、无游戏的资产状态分流。 | 纯新手不知道第一步，内容首页无法兑现导入任务。 | P1 | 未完成引导时只问来源与游戏经验，进入对应路径；已完成用户不重复引导。 |
| G32-A06 | 组件下载、空间、耗时和当前阶段的预期管理不足。 | 首次等待与配置页停留放大流失。 | P1 | 在启动前说明组件、大小、空间、网络和预计耗时；像 233 一样显性展示当前准备阶段。 |
| G32-A07 | 成功/失败配置、机型、引擎与手柄映射尚未作为可复用资产沉淀。 | 不能随着用户使用提高首次成功率，也难形成硬件协同壁垒。 | P2 | 按“游戏 × 机型 × 引擎 × 配置 × 结果”沉淀；成功配置自动复用，手柄接入时加载已验证映射。 |

## 六、阶段性结论与整改验收建议

### 6.1 阶段性结论

1. **不是引擎性能排名。** Prodeus 在 GameHub 与 233 都能启动，Neon Abyss 只有 233 的当前默认路径成功；结论必须管理到“游戏 × 机型 × 引擎 × 配置”的组合。
2. **GameHub 的优势应保留。** 自动元数据、游戏库资产感、明确退出与风险提示均优于本轮竞品，不应为了补启动问题而退回文件工具式体验。
3. **首要短板是启动确定性。** Neon Abyss 的静默失败与历史 `game_launch_click → game_machine_enter` 3.9% 的低转化方向一致，但因果关系仍需用户级事件序列验证。
4. **纯新手需要任务导向，而不是技术导向。** 233 的“导入 PC 游戏”最接近明确第一步；GameNative 的原始参数应只保留在高级模式。

⚠️ 判断可能存在问题，此处需要深度思考和决策。

若继续将详情页、社区或商业化入口排在启动成功率之前，优化的只是用户“失败前看到什么”，并没有解决用户为什么离开。建议先让默认启动、失败分类和恢复链路形成闭环，再承接云游戏、会员、存档、手柄等长期价值。

### 6.2 后续整改验收

| 优先级 | 整改项 | 验收标准 |
|---|---|---|
| P0 | 修复 Neon Abyss 默认配置 | NX729J、同一文件，冷启动和热启动各连续 3 次进入可接收输入的实际场景。 |
| P0 | 正确分类退出 | 主动退出、异常退出、系统终止三类事件与用户可见状态、日志口径一致；`returnCode != 0` 且未进入 game loaded 不得记为 `normalExit=true`。 |
| P0 | 启动失败自愈与可见恢复 | 候选配置 A 失败后自动尝试 B/C；用户可取消；全部失败时显示失败阶段、已尝试方案、重试和可用替代方案，不能静默回详情。 |
| P0 | 兼容性状态可决策 | 游戏库、搜索、详情使用统一兼容状态；无数据明确写“待验证”，不得以 `--` 代替。 |
| P1 | 新手资产分流 | 未完成引导用户可选择“我有游戏文件 / 我有 Steam 或 Epic / 我还没有游戏”；首次成功后记录结果，不重复进入引导。 |
| P1 | 环境准备透明 | 首次组件准备明确展示组件、大小、空间、网络、预计时间、当前阶段与失败恢复。 |
| P2 | 数据与手柄资产 | 成功配置可跨二次启动复用；有盖世手柄时可加载该游戏、该机型已验证的映射与性能方案。 |

### 6.3 数据验证与最小回归集

| 类型 | 指标/用例 | 验收口径 |
|---|---|---|
| 核心指标 | 首次启动成功率 | 新用户首次点击后进入可玩场景的用户占比；不以标题页替代。 |
| 核心指标 | 游戏级成功率 | 按游戏、机型、Wine、GPU、配置版本拆分。 |
| 恢复指标 | 首方案失败后的挽回率 | A 失败后由 B/C 或可用替代模式成功的比例。 |
| 质量指标 | 异常退出正确识别率 | 非 0 返回码、崩溃、用户退出分类准确且与日志一致。 |
| 信任指标 | 兼容标签兑现率 | “一键可玩”标记的启动成功率建议不低于 95%。 |
| 回归集 | 游戏与启动 | Prodeus、Neon Abyss；冷启动、热启动各 3 次。 |
| 回归集 | 状态与边界 | 主动退出、异常退出、系统终止；首次无组件、组件已缓存、空间不足、断网。 |
| 回归集 | 设备与资产 | 无手柄、盖世手柄、第三方手柄；成功后存档、冲突、恢复与再次启动。 |

## 七、事实、限制与证据索引

### 7.1 已验证事实

- GameHub 与 233 均能在目标真机启动 Prodeus。
- 233 能在目标真机启动 Neon Abyss 并进入可接收输入的酒吧场景。
- GameHub 两次启动 Neon Abyss 均失败，日志返回码为 139。
- GameHub 对本地游戏的元数据补全明显优于 233 和已测的 GameNative 0.9.0。
- GameHub Prodeus 有明确退出入口和未保存风险确认；233 返回/退出语义较弱。

### 7.2 不可外推项

- GameNative 1.1.1 的 Steam 库、登录后启动、存档、退出和商业化未验证；设备存在真实在线会话，未获授权使用。
- 未执行付款、订阅、租号或账号绑定。
- 未完成大样本兼容率和同口径性能基准；不对三款产品做全平台性能排名。
- 233 系统包版本与更新页展示版本不一致，后续回归需同时记录两种版本口径。

### 7.3 本轮资料与证据

- 真机证据目录：[evidence](./evidence/)
- `01-baseline`：设备、版本、冷启动与更新页。
- `02-entry`：首页、跳过登录与入口。
- `03-import`：文件选择、扫描、导入结果与元数据。
- `04-config`：推荐方案、PC 设置、GameNative 容器配置。
- `05-launch`：组件安装、冷/热启动、标题页与可玩场景。
- `06-exit`：侧栏、返回、退出确认与退出后状态。
- `07-logs`：GameHub Neon Abyss `returnCode=139` 日志。
- 内部参考：[核心链路数据分析报告](../../数据分析/核心链路数据分析报告.md)、[差异化竞争策略与核心优化方案](../../差异化竞争策略与核心优化方案.md)、[GameHub 6.1.2（124）当前问题阶段汇总](../../../功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.2_124/08-报告/当前问题阶段汇总.md)。

## 八、竞品分析路径（文档底部追加）

### 8.1 GameHub

`启动 → 首页 / 游戏库 → 本地游戏导入 → 选择 EXE → 自动识别元数据 → 游戏详情 → 默认推荐配置 → 环境检查 / 组件准备 → 启动 → 记录标题页或可玩场景 → 游戏内侧栏 → 退出确认 → 再次启动`

本轮 Prodeus 已走通“启动—退出—二次启动”；Neon Abyss 两次均在“默认推荐配置 → 环境检查 → 启动”后约 12—16 秒返回详情。后续复测必须保存配置页、启动过程、返回落点、日志和用户可见状态。

### 8.2 233 乐园

`启动 → PC 游戏页 → 导入 PC 游戏 / 扫描目录 → 首次选择 EXE → Bionic / Loading 准备 → 标题页 → 可玩场景 → 侧栏 / Android 返回 → 再次启动`

本轮 Prodeus 与 Neon Abyss 均走通；Neon Abyss 首次进入可玩场景，二次启动不再要求选择 EXE。后续若触发失败，需单独记录失败态与退出语义，不能用成功路径替代。

### 8.3 GameNative

`启动 → 首次项目介绍 / 分享提示 → 首页（全部 / Steam）→ 搜索本地游戏 → Unknown / 最近拷入文件 → 添加游戏 → 选择 EXE → 容器 / Wine / 语言 / 分辨率 / 音频配置 → 启动 → 退出 / 存档`

本轮仅走到 0.9.0 的搜索、Unknown 和手工配置；1.1.1 发现已有 Steam 在线会话后停止。得到授权前，不进入 Steam 库、登录后启动、付费或存档链路。

### 8.4 纯新手入口复测路径

`强制停止 App → 启动 → 记录首屏内容与首个可执行动作 → 判断是否能回答“我有本地文件 / Steam 或 Epic / 没有游戏时该怎么开始” → 不清数据、不退出账号、不新建账号`

本轮结果仅用于首屏任务清晰度；不把已有账号、缓存和历史游戏数据下的表现误写为全新账号首开体验。

### 8.5 统一记录要求

- 每个平台至少保存：首页/入口、导入或搜索、EXE 选择、组件准备、配置页、启动过程、标题页、可玩场景、退出后与二次启动。
- 每次启动都记录游戏、设备、App/引擎版本、Wine/GPU/分辨率/启动参数（可见时）、冷/热启动、耗时、结果与异常码。
- 到达标题页与进入可玩场景必须分开记录；“未验证”“失败”“无同款/不可比”不得用主观推断替代。
- 遇到登录、验证码、实名、支付确认、已有账号会话或会改变用户资产的操作，停止并标记未验证；不得绕过或代填。
