# GameHub 6.1.1（123）产品验收实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 MuMu 模拟器完成 GameHub 6.1.1（123）控制器映射与游戏库改版的 Official 中文全量验收，以及 Global 五语言关键链路与本地化回归，并交付可追溯证据、问题记录、同步文案和任务板结果。

**Architecture:** 以两份原始 CSV 的 215 条用例为功能真源，在独立输出目录建立“原始用例 → 执行结果 → 证据 → 问题 → 汇总”的追踪链；Official 中文负责全量功能正确性，Global 中文负责渠道差异，Global 英文/俄语/日语/巴西葡萄牙语负责关键主链路与本地化风险。MuMu 交互统一使用 Windows Computer Use，设备信息、截图和进程冷启动可使用 MuMu 自带 ADB 做只读采集与受控测试操作；任何结果未知时重新观察，不复用旧坐标。

**Tech Stack:** MuMu 12、GameHub Android APK、Windows Computer Use（`@oai/sky`）、MuMu ADB、`taskctl`、`@oai/artifact-tool`、Markdown/CSV/XLSX、PNG/MP4。

---

## 文件结构

**创建：**

- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/00-基线/`：包、渠道、语言、环境、账号态和模拟器基线截图。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/01-游戏库/原图/`：Official 中文游戏库原始证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/01-游戏库/标注图/`：游戏库问题红框证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/01-游戏库/录屏/`：旋转、动画、加载等动态证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/02-控制器映射/原图/`：Official 中文控制器映射原始证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/02-控制器映射/标注图/`：控制器映射问题红框证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/02-控制器映射/录屏/`：Toast、设备切换和状态恢复动态证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/03-Global/<语言>/`：Global 中文、English、Русский、日本語、Português-Brasil 的渠道/语言/关键链路证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/04-复测/`：问题复测证据。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/05-报告/GUANWANGGAID-17_验收结果.xlsx`：用例结果、Global 矩阵、问题、汇总。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/05-报告/GUANWANGGAID-17_验收问题记录.md`：问题详情与证据索引。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/05-报告/GUANWANGGAID-17_飞书群同步.txt`：只生成、不发送的同步文案。
- `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/05-报告/GUANWANGGAID-17_验收总结.md`：最终结论、风险和阻塞。

**读取但不覆盖：**

- `功能验收/测试用例/控制器映射云方案测试用例 - Sheet1.csv`
- `功能验收/测试用例/盖世游戏 V6.1.1需求测试用例 - 游戏库改版需求.csv`
- `功能验收/验收prd/【Prd】《盖世游戏》控制器映射云方案需求/【Prd】《盖世游戏》控制器映射云方案需求.md`
- `功能验收/验收prd/【Prd】《盖世游戏》游戏库布局调整需求/【Prd】《盖世游戏》游戏库布局调整需求.md`

## Task 1：建立不可变验收基线

- [ ] **Step 1：确认工单仍由当前任务持有**

Run:

```powershell
taskctl.cmd issue get GUANWANGGAID-17 --json
taskctl.cmd comment list GUANWANGGAID-17 --json
```

Expected：状态为 `in_progress`，`threadId` 为当前 Codex 任务；若版本变化，使用最新工单与评论口径继续。

- [ ] **Step 2：验证 APK 哈希与文件属性**

Run:

```powershell
Get-Item '.\功能验收\验收包\GameHub_beta_6.1.1_123_202608121110.apk' | Select-Object FullName,Length,LastWriteTime
Get-FileHash '.\功能验收\验收包\GameHub_beta_6.1.1_123_202608121110.apk' -Algorithm SHA256
```

Expected：大小 `93963293`；SHA256 为 `834FB3362B6CC3FB322A70AF10294A82652D5DF122FFF9711E6A3FB8BBAEF710`。若变化，停止使用旧基线并按新包重建记录。

- [ ] **Step 3：连接 MuMu 自带 ADB 并读取设备**

Run:

```powershell
& 'D:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe' devices -l
& 'D:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe' shell getprop ro.build.version.release
& 'D:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe' shell wm size
& 'D:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe' shell wm density
```

Expected：至少一个状态为 `device` 的 MuMu 实例；记录 Android 版本、分辨率和密度。若存在多个实例，必须先唯一选择目标序列号，再在后续命令加入 `-s <serial>`。

- [ ] **Step 4：读取 App 版本与包名，不记录凭证**

通过 Windows Computer Use 打开已存在的开发者调试页并截图，确认：

```text
App版本：6.1.1 (123)
Git SHA：42115b9b4
Channel：Official
服务器环境：测试环境
```

Expected：截图仅包含上述运行信息；若界面出现账号、Token、设备 ID 等敏感字段，交付前裁剪或遮盖，不把它们写入报告正文。

- [ ] **Step 5：创建输出目录**

使用 `apply_patch` 添加空目录占位文件或由首个证据文件自然创建目录；不得删除或覆盖 `功能验收/历史备份` 与现有问题记录。

Expected：所有新产物只位于 `功能验收/ai输出结果/GUANWANGGAID-17_GameHub_6.1.1_123/`。

## Task 2：构建结果工作簿骨架

- [ ] **Step 1：导入两份 CSV**

使用 `@oai/artifact-tool` 的 `Workbook.fromCSV(...)` 分别读取 118 条和 97 条用例，不修改源 CSV。

Expected：控制器映射表范围 `A1:F119`；游戏库表范围 `A1:F98`；用例 ID 唯一且标题、前置、步骤、预期非空。

- [ ] **Step 2：创建执行字段**

在两个明细表后新增以下列：

```text
实际结果 | 状态 | 问题ID | 优先级 | 包版本 | 渠道 | 语言 | 环境 | 执行设备 | 执行时间 | 证据路径 | 备注
```

状态数据验证固定为 `PASS,FAIL,BLOCKED,N/A`，优先级固定为 `P0,P1,P2,建议,无`。

Expected：原 6 列内容保持不变；新增列初始为空，不预填 PASS。

- [ ] **Step 3：创建 Global 本地化矩阵**

新增 `Global本地化` 工作表，字段固定为：

```text
检查点ID | 功能 | 页面/状态 | 渠道 | 语言 | 屏幕方向 | 操作步骤 | 预期 | 实际结果 | 状态 | 问题ID | 证据路径 | 执行时间 | 备注
```

语言行至少覆盖 `中文`、`English`、`Русский`、`日本語`、`Português (Brasil)`；每种语言包含：设置保存、冷启动保持、游戏库竖屏、游戏库横屏、二级页面、云游戏启动、Esc 侧边栏、映射广场、方案详情、应用、编辑保存、重启恢复。

- [ ] **Step 4：创建问题表与汇总表**

`问题记录` 字段：

```text
问题ID | 关联用例/检查点 | 模块 | 优先级 | 包版本 | 渠道 | 语言 | 环境 | 前置条件 | 复现步骤 | 预期结果 | 实际结果 | 复现率 | 原图 | 标注图 | 录屏 | 建议 | 状态 | 复测结果 | 复测证据
```

`验收汇总` 使用公式统计 Official 中文 215 条的 PASS/FAIL/BLOCKED/N/A、执行数与通过率，以及 Global 各语言检查点状态；通过率公式只使用 `PASS/(PASS+FAIL)`。

- [ ] **Step 5：导出初始工作簿并验证**

Run（由计划执行器创建的构建脚本执行）：

```powershell
& 'C:\Users\z3635\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '<builder-path>'
```

Expected：工作簿保存到 `05-报告/GUANWANGGAID-17_验收结果.xlsx`；检查关键区域无 `#REF!|#DIV/0!|#VALUE!|#NAME?|#N/A`；所有工作表均渲染一次并目视确认无标题截断、列宽异常或空白默认表。

## Task 3：Official 中文游戏库全量验收

- [ ] **Step 1：回到 App 首页并建立登录/数据状态**

使用 Windows Computer Use 观察 MuMu 最新画面；需要登录时使用工单提供的账号，仅在 MuMu 中输入，不打印、不保存、不截图输入内容。

Expected：App 处于 Official、中文、测试环境；账号态可支持游戏库页面访问。

- [ ] **Step 2：执行竖屏 PC 游戏与复古游戏首页用例 GL001–GL028**

按页面一次性观察静态项，再分别执行 Tab、入口、搜索、排序、筛选和导入跳转；每次改变页面后重新获取窗口状态。

Expected：每条用例写入实际结果与四态判定；至少保存 PC 首页、复古首页、搜索展开、排序菜单、筛选菜单、导入页面证据。

- [ ] **Step 3：执行横屏首页用例 GL029–GL043**

通过 App 内横竖屏按钮切换，记录切换前后画面；若需要测 500ms 或闪烁，使用录屏或连续截图，不凭主观回忆填写。

Expected：横屏导航、最近游戏、二级 Tab、入口、搜索方向与网格都有证据；切回后记录 Tab 是否保持。

- [ ] **Step 4：执行 Steam 用例 GL044–GL080**

先验证未绑定态；登录授权需要用户接管或在操作前确认。已绑定后覆盖数据、好友、成就和创意工坊能由当前数据支持的用例。

Expected：无账号/好友/MOD/成就数据的用例标 `BLOCKED`，原因写明具体缺失条件；不把空数据页面直接判成 PASS。

- [ ] **Step 5：执行 Epic 与导入用例 GL081–GL097**

覆盖未绑定/已绑定、菜单、退出后的状态恢复及文件选择器。退出账号属于破坏性操作，执行前向用户确认；若未授权，相关用例标 `BLOCKED`。

Expected：所有 97 条游戏库用例均有状态、实际结果和证据或阻塞原因。

- [ ] **Step 6：记录与标注问题**

每个 FAIL 至少复现一次。保留完整原图，再生成红框标注图；用 `ISSUE-GL-001` 递增编号，反链全部受影响用例。

Expected：问题图中红框只圈出实际问题，不圈无关区域；原图和标注图均可打开。

## Task 4：Official 中文控制器映射全量验收

- [ ] **Step 1：启动支持侧边栏的云游戏**

选择已有可启动且支持控制器映射测试的云游戏；进入游戏画面后按 `Esc` 调出侧边栏。

Expected：保留云游戏画面和 Esc 后侧边栏两张基线证据；若游戏启动受网络/时长/权益阻塞，记录具体原因并继续可独立执行的其他用例。

- [ ] **Step 2：执行侧边栏与设备用例 CM-SID-001–019、CM-DEV-001–010**

覆盖总开关、Toast、设备区、持久化、虚拟按键显隐和当前环境能支持的设备状态。物理手柄缺失时，相关用例标 `BLOCKED`；不模拟假手柄状态。

Expected：开关前后、重启恢复、Esc 侧边栏和设备列表均有证据；PRD 冲突项记录“需求口径待定”。

- [ ] **Step 3：执行引导与广场用例 CM-GUIDE、CM-SQ、CM-GAME**

覆盖引导弹窗、推荐/排行/自定义、搜索、无结果、查看全部、排序和卡片字段。

Expected：搜索输入使用专用测试词，不输入账号或敏感信息；结果数量与实际卡片数核对。

- [ ] **Step 4：执行详情、保存、编辑用例 CM-DET、CM-SAVE、CM-EDIT**

创建测试方案时使用唯一测试名，例如 `验收611A`；记录应用即时生效、复制、编辑、保存、返回确认和重启恢复。删除测试方案属于破坏性操作，执行前向用户确认。

Expected：不删除用户原有方案；创建的测试数据在问题表备注中可辨识。

- [ ] **Step 5：执行分享与导入用例 CM-SHARE、CM-IMPORT**

无效分享码可直接验证；发布到云端、跨账号可见性和有效码导入会创建外部可见数据或依赖第二账号，执行前确认。未获授权或缺数据时标 `BLOCKED`。

Expected：不把分享内容复制到外部应用；剪贴板验证只在受控本地位置进行，并在交付前清除包含测试码的临时内容。

- [ ] **Step 6：记录与标注问题**

使用 `ISSUE-CM-001` 递增编号；Toast、热插拔、即时生效等动态问题优先录屏。

Expected：118 条控制器映射用例全部有四态判定。

## Task 5：Global 中文渠道回归

- [ ] **Step 1：切换 Global 渠道**

在“我的”页长按设置入口，进入开发者调试页，将渠道标识改为 `global` 并保存。

Expected：保存动作完成后不立即宣称成功；记录保存前 Official 和保存后 Global 的界面证据。

- [ ] **Step 2：执行冷启动验证**

使用 MuMu ADB 结束 App 进程，再通过 MuMu 图标重新启动；不得用页面刷新或仅返回桌面替代。

Expected：重启后开发者调试页仍显示 Global，服务环境仍为测试；若渠道回退，记录 FAIL。

- [ ] **Step 3：执行 Global 中文关键链路**

覆盖游戏库竖屏/横屏、PC/复古 Tab、Steam/Epic/导入入口、一个二级页面、云游戏启动、Esc 侧边栏、映射广场、详情、应用、编辑保存和重启恢复。

Expected：对比 Official 中文，记录海外渠道新增、隐藏、接口、资源、文案和数据差异；未确认的预期差异列为建议或待确认，不直接判错。

## Task 6：Global 四种外语本地化回归

对 `English`、`Русский`、`日本語`、`Português (Brasil)` 逐种执行以下步骤；任何语言不可用前一种语言的证据代替。

- [ ] **Step 1：切换语言并保存**

Expected：设置页显示目标语言已选中；截图同时能辨认语言选项和当前渠道。

- [ ] **Step 2：冷启动并验证持久化**

结束 App 进程后重新启动，检查首页和设置页语言仍保持。

Expected：语言未回退、未串语；资源加载完成后再截图，避免把加载中误判为缺失翻译。

- [ ] **Step 3：验收游戏库本地化检查点**

覆盖竖屏/横屏首页、PC/复古 Tab、入口卡片、搜索、排序、筛选、Steam/Epic/导入至少一个二级页面。

Expected：逐页检查未翻译、混合语言、乱码、缺字、占位符、截断、重叠、换行和按钮溢出；俄语与葡语重点检查长文本，日语重点检查字形与标点换行。

- [ ] **Step 4：验收控制器映射本地化检查点**

启动云游戏，按 `Esc`，覆盖侧边栏、引导、广场、详情、应用 Toast、编辑保存及重启恢复。

Expected：动态方案字段允许保留用户内容原文，但系统 UI、错误提示、按钮、Tab 和 Toast 应符合目标语言；语言切换后旧页面缓存不得继续显示前一种系统语言。

- [ ] **Step 5：更新 Global 矩阵与问题表**

本地化问题使用 `ISSUE-L10N-001` 递增编号；同一资源键影响多语言时可合并问题，但分别记录语言和证据。

Expected：五种 Global 语言均有完整检查点状态或明确阻塞原因。

## Task 7：复测、统计与证据审计

- [ ] **Step 1：复测所有可立即验证的 FAIL**

重新进入相同渠道、语言、方向和前置状态，执行相同步骤；复测证据写入 `04-复测`。

Expected：问题状态更新为“仍存在”或“未复现”，不得在无证据时改为已修复。

- [ ] **Step 2：核对 215 条用例完整性**

使用工作簿检查：控制器 118 条、游戏库 97 条；状态空白数为 0。

Expected：每条均为 PASS/FAIL/BLOCKED/N/A，执行数与通过率公式一致。

- [ ] **Step 3：核对 Global 五语言矩阵**

Expected：每种语言的设置保存、冷启动、游戏库和控制器映射检查点均有状态；没有用中文证据引用到外语行。

- [ ] **Step 4：核对问题与证据**

检查所有 FAIL 的问题 ID、原图、标注图和复现步骤；检查文件存在、命名正确、敏感信息未进入截图或文档。

Expected：FAIL 无孤儿用例，问题无断链证据；BLOCKED 不进入通过率。

- [ ] **Step 5：渲染并验证最终工作簿**

使用 `workbook.inspect` 检查明细、汇总与公式错误；渲染所有工作表做视觉检查后导出最终 `.xlsx`。

Expected：无公式错误、无标题或统计截断，状态条件格式与筛选可用。

## Task 8：生成报告与飞书同步文案

- [ ] **Step 1：生成验收问题记录**

按 P0、P1、P2、建议排序，事实、推断和建议分开；PRD 冲突项单列“待产品定版”。

Expected：每个问题包含实际表现、引用预期、影响、复现步骤、复现率、证据和建议。

- [ ] **Step 2：生成验收总结**

先给出结论，再列 Official 中文统计、Global 五语言统计、P0/P1、阻塞项、PRD 冲突和发布建议。

Expected：不存在“局部通过”等同于“整版通过”；渠道和语言范围表达准确。

- [ ] **Step 3：生成飞书群同步文案**

文案模板：

```text
同步一下，GameHub 6.1.1（123）产品验收已完成。
范围：游戏库布局调整、控制器映射云方案；覆盖 Official 中文全量，以及 Global 中文/英文/俄语/日语/巴西葡萄牙语关键链路与本地化。
Official 中文：共215条，PASS X、FAIL X、BLOCKED X、N/A X，通过率 X%。
Global：共X个检查点，PASS X、FAIL X、BLOCKED X。
当前共发现X个问题：P0 X、P1 X、P2 X、建议 X。
P0/P1问题：
1. [问题ID] [问题摘要]（关联用例/语言/证据）
阻塞项：[原因与所需资源]
详细问题记录及证据：<本地交付路径>
```

Expected：只保存到 `GUANWANGGAID-17_飞书群同步.txt`，不实际发送。

## Task 9：回写任务板并移交评审

- [ ] **Step 1：读取最新工单版本**

Run:

```powershell
taskctl.cmd issue get GUANWANGGAID-17 --json
taskctl.cmd comment list GUANWANGGAID-17 --json
```

Expected：合并用户或其他协作者新增的最新要求，不覆盖工单描述。

- [ ] **Step 2：添加验收结果评论**

评论包含：实际验收包、渠道/语言、用例与检查点统计、问题分级、证据目录、阻塞和剩余风险；不包含任何账号、密码、Token 或设备标识。

Run:

```powershell
taskctl.cmd comment add GUANWANGGAID-17 --body '<验收摘要>' --json
```

Expected：评论创建成功并归属当前 Codex 任务。

- [ ] **Step 3：移至 in_review**

先重新读取工单获得最新 `version`，再执行：

```powershell
taskctl.cmd issue move GUANWANGGAID-17 --status in_review --if-version <latest-version> --json
```

Expected：状态为 `in_review`；未经用户明确验收，不移至 `done`。

## Task 10：沉淀通用功能验收 Skill

- [ ] **Step 1：调用 `skill-creator`**

以本轮实际流程为输入，创建通用 Skill，覆盖资料预审、taskctl 工单、MuMu、ADB、Windows Computer Use、四态判定、Global 多语言、证据红框、工作簿、飞书文案和复测。

- [ ] **Step 2：移除项目特有信息**

Skill 中不得包含本项目账号、密码、APK 哈希、内部域名、设备 ID 或固定项目路径；使用参数和占位说明。

- [ ] **Step 3：验证 Skill**

运行 Skill 结构/引用检查，并用一个不含凭证的最小示例验证可理解性。

Expected：Skill 可供后续功能验收复用，且不会泄露本轮敏感信息。

## 计划自检

- 规格覆盖：包含 Official 中文 215 条、Global 中文渠道回归、Global 四种外语、冷启动、横竖屏、控制器 `Esc`、四态判定、红框证据、报告、飞书文案、任务板和 Skill。
- 无占位失败：执行时才产生的统计值使用 `X` 仅存在于最终文案模板，不代表未定义需求；所有操作步骤和判定规则已固定。
- 类型一致性：状态统一为 `PASS/FAIL/BLOCKED/N/A`；优先级统一为 `P0/P1/P2/建议`；渠道统一为 `Official/Global`。
- 风险一致性：删除、退出、移除、取消订阅、云端发布、外部发送和认证均在动作前确认；本地测试渠道/语言切换已由用户授权。
