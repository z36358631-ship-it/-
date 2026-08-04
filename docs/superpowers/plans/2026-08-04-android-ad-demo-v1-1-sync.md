# Android 广告接入 Demo V1.1 同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Android 广告接入交互标注 Demo 定点同步到已评审的 V1.1 PRD，并保持原有三栏标注框架与页面视觉不被重写。

**Architecture:** 继续使用单文件 HTML；保留第一个 `window.DEMO_ASSETS` Base64 素材脚本，只修改第二个业务脚本中的数据、渲染、交互和标注。用户端按“首批上线/后续候选”分组，后台固定为投放配置、国内全局 A/B、效果统计三页。

**Tech Stack:** HTML、CSS、原生 JavaScript、内嵌 Base64 素材、PowerShell/Node.js 静态校验。

---

### Task 1: 收敛广告位与导航范围

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: 固化目标广告位集合**

  用户端首批只展示 `C1`、`Q1`、`M1`，后续候选展示 `G1`、`T1`、`S1`、`S2`、`S3`；删除 `O1`、`R1` 与运营资源位后台入口。

- [x] **Step 2: 更新默认状态与重置状态**

  将默认页和重置后的用户页设为 `C1`，删除 `r1`、`o1Step`、`resources` 等已移除范围的状态依赖。

- [x] **Step 3: 静态核对导航引用**

  Run: `rg -n "O1|R1|resource" demos/Android广告接入-交互标注版.html`

  Expected: 业务导航、渲染器和标注中不再出现已移除页面；Base64 素材中的偶然字符串不作为失败。

### Task 2: 同步投放配置与地区广告网络

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: 更新国内和海外配置数据**

  国内激励广告 `C1/G1/Q1` 使用穿山甲，国内原生/信息流 `S1/S2/S3/M1/T1` 使用腾讯广告；海外仅保留 `S1/S2/S3/M1/T1` 并使用 Google AdMob。

- [x] **Step 2: 补齐可配置参数**

  每条配置显示广告位 ID、投放位置数组、单页数量、目标人群、开关和频控；首批与候选状态在列表中可辨识。

- [x] **Step 3: 更新搜索和信息流说明**

  搜索默认页固定为“热游推荐→热门搜索”，热门搜索每页 10 条、统一图标且无 Banner；M1/T1 的关闭与负反馈说明改为广告平台原生控件。

### Task 3: 同步激励广告业务规则

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: 修改签到激励状态机**

  奖励只在 SDK 完整播放/奖励成功回调后发放；成功后关闭签到结果弹窗并提示“奖励已发放”，播放未完成时保持签到结果弹窗且奖励不发放，主动关闭后当天不再提供入口。

- [x] **Step 2: 修改排队激励状态机**

  显示用户全部剩余云游戏时长；C1 与 Q1 每日各 1 次且互不占用次数；成功回调后立即刷新排队权益状态。

- [x] **Step 3: 校验失败与重置路径**

  重置后恢复未领取状态；失败路径不错误增加时长或加速权益。

### Task 4: 重构国内全局 A/B 与效果统计

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: 将 A/B 收敛为单一国内全局实验**

  仅国内可配置“有广告/无广告”，默认 50%:50%，游客使用匿名安装 ID 稳定分桶；海外展示不支持 A/B 的空状态。

- [x] **Step 2: 收敛效果统计口径**

  自有后台只展示两组样本量、次日留存、7 日留存、整体付费率及组间差值；曝光、点击、CPM、CTR、收入等标明前往第三方广告平台查看。

- [x] **Step 3: 补充配置失败原则**

  标注明确客户端启动时拉取广告配置，拉取失败则全部广告关闭。

### Task 5: 同步右侧交互标注

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: 删除过期标注**

  移除 `O1`、`R1`、运营资源位页及旧收入/CTR/填充率口径说明。

- [x] **Step 2: 补齐触发、展示、交互与异常边界**

  为首批页、候选页、三张后台页分别说明触发条件、展示规则、交互规则、SDK 回调、频控独立性、原生负反馈和配置失败降级。

- [x] **Step 3: 检查标注联动**

  左侧导航切换后，中间 Demo 和右侧对应标注必须同步。

### Task 6: 语法、结构与交互验收

**Files:**
- Test: `demos/Android广告接入-交互标注版.html`

- [x] **Step 1: JavaScript 语法检查**

  Run: `node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('demos/Android广告接入-交互标注版.html','utf8');const s=[...h.matchAll(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]);new vm.Script(s[1]);console.log('JS syntax OK')"`

  Expected: `JS syntax OK`

- [x] **Step 2: 结构检查**

  核对用户端 8 个页面、后台 3 个页面、左右面板 Tab、标号显隐、面板折叠和重置入口均存在。

- [x] **Step 3: Smoke Test**

  逐项操作 C1 成功/失败、Q1 成功/失败、M1 原生负反馈、国内/海外切换、全局 A/B、统计页、左导航、右标注 Tab、标号显隐和重置。

- [x] **Step 4: 视觉检查**

  截取 C1、Q1、M1、投放配置、A/B、效果统计关键状态，检查无穿模、遮挡、溢出和旧页面残留。

### 自检

- PRD 范围已覆盖：首批/候选、广告网络、A/B、统计、配置失败、激励回调、负反馈、搜索规则均有对应任务。
- 不触碰 Base64 素材脚本，不重构三栏框架，不新增 PRD 外功能。
- 本计划无待补占位内容；用户已选择当前会话内直接执行。
