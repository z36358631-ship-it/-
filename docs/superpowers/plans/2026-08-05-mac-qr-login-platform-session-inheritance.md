# Mac 扫码登录平台会话继承 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的扫码登录安全协议、Steam/Epic 全量会话继承、异常状态与验收规则落入原 PRD、标注 Demo、流程图和页面截图。

**Architecture:** 以服务端 challenge 为唯一登录真值源，移动端只负责扫描与确认；确认后服务端为 Mac 签发设备绑定的盖世账号会话，并为全部已绑定平台重新签发 Mac 专属会话。授权采用全成功提交、任一失败全量回收，Mac 仅在全部会话可用后进入登录成功态。

**Tech Stack:** Markdown、单文件 HTML/CSS/JavaScript、Playwright/Chromium、本地静态文件、taskctl CLI

---

## 文件结构

- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`：追加 V1.1 版本记录，统一产品规则、状态机、异常、埋点、发布保护和验收标准。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`：同步确认页、授权中、成功、失败与权限状态，并补全右侧交互说明。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.png`：展示 challenge、扫码确认、全部平台会话签发、失败回收与 Mac 领取链路。
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image*.png`：替换 PRD 当前引用的关键状态截图，保持文档与 Demo 一致。
- Create: `docs/superpowers/plans/2026-08-05-mac-qr-login-platform-session-inheritance.md`：记录本实施计划。

### Task 1: PRD 规则与状态机

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [ ] **Step 1: 追加 V1.1 版本记录**

在版本表新增：

```markdown
|2026\.08\.05|V1\.1|郑群超 / Codex|补充 Mac 独立设备会话、Steam/Epic 自动继承、安全交换协议、状态机、异常与验收|GUANWANGGAID-1|
```

- [ ] **Step 2: 统一登录与继承规则**

正文必须明确以下规则：

```text
移动端确认后，服务端为 Mac 重新签发独立、设备绑定的盖世账号会话；不复制移动端 Token。
自动继承当前盖世账号下全部已绑定且可用的 Steam/Epic 平台，不提供单个平台开关。
全部目标会话签发成功后才完成登录；任一平台失败时回收本次已签发的全部 Mac 会话。
Steam/Epic 使用自有平台会话体系，不触发第三方拒绝或二次验证。
```

- [ ] **Step 3: 重写状态与异常边界**

状态主路径统一为：

```text
waiting_scan → pending_confirm → authorizing → ready_to_claim → used
```

失败分支必须覆盖 `cancelled`、`expired`、`invalid`、`authorization_failed`，并说明 15 秒授权等待、幂等、防重放、并发优先级、Outbox 与补偿回收。

- [ ] **Step 4: 补齐章节与验收**

补充五至九章，至少包含：非功能需求、埋点、上线准备、上线后记录、验收标准、灰度与回滚；范围明确为国内与海外共同支持，平台集合按账号实际绑定关系返回。

- [ ] **Step 5: 运行 PRD 静态检查**

Run:

```powershell
rg -n "V1\\.1|authorizing|authorization_failed|15 秒|独立.*会话|全部.*回收|Steam|Epic|验收标准|灰度|回滚" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md"
```

Expected: 每项规则至少命中一次；旧 V1.0 版本记录仍存在。

### Task 2: 标注 Demo 状态与交互

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`

- [ ] **Step 1: 新增授权中与授权失败状态**

状态导航和 `stateLabels` 增加：

```javascript
authorizing: ["签发平台会话", "正在登录 Mac 端"],
authorizationFailed: ["登录未完成", "重新扫码"]
```

- [ ] **Step 2: 更新确认页与成功反馈**

确认页明确展示“将自动继承全部已绑定平台”；点击确认后先进入 `authorizing`，15 秒内完成则进入 `success`；Mac 成功页展示盖世账号以及 Steam/Epic 已可用，不提供平台勾选或开关。

- [ ] **Step 3: 补充失败回收交互**

授权失败状态显示：

```text
登录未完成
平台登录状态未能全部同步，本次授权已撤销，请重新扫码
```

点击刷新或重新扫码返回 `waiting_scan`，不保留部分平台会话。

- [ ] **Step 4: 同步右侧说明**

`detailContent` 必须同步独立设备会话、全部继承、全成全败、幂等、防重放、15 秒等待、后台与弱网处理，避免预览与说明相互矛盾。

- [ ] **Step 5: 运行结构检查**

Run:

```powershell
rg -n "authorizing|authorizationFailed|自动继承|全部已绑定|15 秒|本次授权已撤销|不复制移动端" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html"
```

Expected: 两个新增状态在导航、状态数据、渲染逻辑和说明中均有命中。

### Task 3: 流程图与截图

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录功能流程图.png`
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image*.png`

- [ ] **Step 1: 更新流程图源内容**

流程图必须包含：Mac 生成一次性 challenge、移动端扫码与确认、服务端创建 `authorizing`、并行签发盖世/Steam/Epic Mac 独立会话、全成功后生成 Mac 私有领取凭证、任一失败执行补偿回收。

- [ ] **Step 2: 启动本地预览**

Run:

```powershell
python -m http.server 8765 --directory "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件"
```

Expected: `http://127.0.0.1:8765/扫码登录Mac端交互标注版demo.html` 返回 200。

- [ ] **Step 3: 截取关键状态**

使用查询参数分别打开 `wait`、`permissionDenied`、`confirm`、`authorizing`、`success`、`expired`、`cancelled`、`authorizationFailed`，确认页面无横向溢出、状态标题与右侧说明一致，再保存 PRD 引用的截图。

- [ ] **Step 4: 校验图片**

Run:

```powershell
Get-ChildItem "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件" -Filter *.png | Select-Object Name,Length
```

Expected: 流程图和关键截图均非 0 字节；截图可正常解码。

### Task 4: 验收与任务板交付

**Files:**
- Verify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`
- Verify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`

- [ ] **Step 1: 执行一致性检查**

确认 PRD、Demo、流程图、截图对以下规则无冲突：自动继承全部平台、Mac 独立会话、全成全败、15 秒授权中、失败回收、无第三方二次验证。

- [ ] **Step 2: 执行三视角评审**

前端开发检查实现信息，测试检查异常与并发，业务检查平台继承和发布规则；硬伤直接回填 PRD，建议项单独记录。

- [ ] **Step 3: 检查差异与工作区边界**

Run:

```powershell
git diff --check -- "docs/superpowers/plans/2026-08-05-mac-qr-login-platform-session-inheritance.md" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求"
git status --short -- "docs/superpowers/plans/2026-08-05-mac-qr-login-platform-session-inheritance.md" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求"
```

Expected: `git diff --check` 无输出；状态仅包含本任务文件。

- [ ] **Step 4: 提交任务文件**

Run:

```powershell
git add -- "docs/superpowers/plans/2026-08-05-mac-qr-login-platform-session-inheritance.md" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求"
git commit -m "docs: revise Mac QR login inheritance flow"
```

Expected: 提交只包含本任务计划、PRD、Demo、流程图及其截图。

- [ ] **Step 5: 回写任务板并移至待评审**

先读取 `GUANWANGGAID-1` 最新版本，添加变更、验证、结果和剩余风险评论，再使用最新 `version` 移动至 `in_review`；不得直接移动到 `done`。

## 自检结果

- 规格覆盖：本计划已覆盖设计规格中的挑战码、领取凭证、会话签发、全成全败、幂等、防重放、并发、Outbox、弱网、权限、生命周期、灰度、回滚和验收。
- 占位符检查：所有步骤均包含明确内容、命令和预期结果。
- 名称一致性：PRD 与 Demo 统一使用 `waiting_scan`、`pending_confirm`、`authorizing`、`ready_to_claim`、`used`、`authorization_failed`。
