# Game Blind Box PRD V1.8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简游戏盲盒 PRD，并用当前 Demo 的 5 个真实页面状态合成一张横向产品流程图。

**Architecture:** 保持 Demo 和业务规则不变。Node 脚本用 Playwright 截取 Demo 状态，Python/Pillow 将 5 张截图、步骤标题和箭头合成一张 PNG；PRD 只引用合成图，并把重复规则收敛到唯一章节。

**Tech Stack:** HTML Demo、Playwright Core、Python 3、Pillow、Markdown、PowerShell、Git

---

## 文件分工

- `tools/capture-game-blind-box-product-flow.mjs`：打开当前 Demo，依次截取 5 个流程状态。
- `tools/compose-game-blind-box-product-flow.py`：统一裁切和缩放截图，生成横向流程图。
- `public/prd/game-blind-box/05-product-flow.png`：PRD 使用的最终流程图。
- `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`：V1.8 PRD，保留一份最终规则。
- `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`：记录本轮决定、产物和验证结果。
- `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`：记录 S5—S8 执行状态。

### Task 1: 截取 5 个真实流程状态

**Files:**
- Create: `tools/capture-game-blind-box-product-flow.mjs`
- Read: `demos/首页与探索/游戏盲盒demo.html`
- Output: `test-results/game-blind-box/product-flow-source/*.png`

- [ ] **Step 1: 创建截图脚本**

脚本须使用现有 `demo` API，不修改 Demo。固定简中、竖屏和 `?test=1`，按下列顺序截取 `#device`：

```js
const steps = [
  ['01-library.png', async () => page.evaluate(() => demo.setDemoState('library'))],
  ['02-modal-open.png', async () => page.locator('[data-testid="blind-entry"]').click()],
  ['03-random-switch.png', async () => page.waitForFunction(
    first => document.querySelector('[data-testid="drawing"]')?.dataset.previewGame !== first,
    await page.locator('[data-testid="drawing"]').getAttribute('data-preview-game')
  )],
  ['04-result.png', async () => page.evaluate(() => demo.finishDraw())],
  ['05-details.png', async () => page.locator('[data-testid="view-details"]').click()],
];
```

每步执行后等待界面稳定，再用 `device.screenshot()` 输出。记录 `pageerror`，发现错误时退出码为 1。

- [ ] **Step 2: 运行截图脚本**

Run:

```powershell
node tools/capture-game-blind-box-product-flow.mjs
```

Expected: 输出 5 个 PNG 路径，无 `pageerror`。

- [ ] **Step 3: 核对截图状态**

检查：入口卡在“我的游戏”首位；步骤 2、3 均为同一弹窗容器；步骤 4 显示“查看详情”“再抽一次”；步骤 5 为现有游戏详情。

### Task 2: 合成一张横向流程图

**Files:**
- Create: `tools/compose-game-blind-box-product-flow.py`
- Read: `test-results/game-blind-box/product-flow-source/*.png`
- Create: `public/prd/game-blind-box/05-product-flow.png`

- [ ] **Step 1: 创建合成脚本**

脚本使用 Pillow：

```python
STEPS = [
    ("01-library.png", "1  游戏库入口"),
    ("02-modal-open.png", "2  打开盲盒"),
    ("03-random-switch.png", "3  随机切换"),
    ("04-result.png", "4  命中游戏"),
    ("05-details.png", "5  游戏详情"),
]
```

统一将截图缩放到同一高度，放入深色卡片；步骤标题位于截图上方，相邻卡片之间显示右箭头。最终图宽度控制在 5000 px 内，背景不透明，输出 PNG。

- [ ] **Step 2: 生成流程图**

Run:

```powershell
& 'C:\Users\z3635\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' tools/compose-game-blind-box-product-flow.py
```

Expected: 生成 `public/prd/game-blind-box/05-product-flow.png`，脚本输出尺寸与文件大小。

- [ ] **Step 3: 原尺寸审图**

检查：5 步顺序正确；截图未拉伸、无遮挡；标题和箭头清晰；缩放后仍能辨认页面变化；步骤 3 明确是弹窗中间态，不像独立页面。

- [ ] **Step 4: 提交流程图和工具**

```powershell
git add -- tools/capture-game-blind-box-product-flow.mjs tools/compose-game-blind-box-product-flow.py public/prd/game-blind-box/05-product-flow.png
git commit -m "docs: add game blind box product flow"
```

Expected: 产生只包含上述 3 个文件的本地提交；记录完整 40 位 SHA，供 PRD 图片地址使用。

### Task 3: 精简 PRD 至 V1.8

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`

- [ ] **Step 1: 追加 V1.8 修订记录**

新增一行：

```markdown
| 2026/8/27 | 精简重复说明；产品流程改为 5 步真实页面合成图 | V1.8 | 产品 |
```

- [ ] **Step 2: 精简背景与方案**

第一章只保留目标用户、当前问题、现有方式和本期边界。第二章只保留方案概述和一张流程图，删除与第三章重复的文字流程、候选过滤、权重、去重和失败规则。

流程图使用 Task 2 的实际提交 SHA。先生成固定地址：

```powershell
$imageCommit = git rev-parse HEAD
$imageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/game-blind-box/05-product-flow.png"
$imageUrl
```

将命令输出的完整地址写入 `![产品流程](...)`。

- [ ] **Step 3: 按 vNext 页面结构收敛规则**

第三章保留 vNext 的页面层级。候选和抽取规则在“游戏库”六要素表中完整定义：

1. 入口资格和排序。
2. 候选来源、过滤和统一 `game_id` 去重。
3. 权重、未下载候选 30% 上限和同轮不重复。
4. 抽取、结果重校验、失败和恢复。
5. “查看详情”“再抽一次”和关闭行为。
6. 横竖屏及五语言差异。

页面状态、横竖屏差异和页面子功能表放在“游戏库”页面下，只写各自状态或展示差异，不重复完整算法。

- [ ] **Step 4: 保留两个页面六要素表**

严格按 vNext 模板保留“游戏库”“现有游戏详情”两个页面，每页使用 `要素 | 内容说明` 六要素表。游戏库下保留页面状态、横竖屏差异和子功能汇总；不改为功能汇总大表。

- [ ] **Step 5: 精简非功能和待确认项**

第四章只保留埋点、横竖屏兼容、动画性能、运营素材和版权要求。删除重复的候选和异常规则，改为引用第三章。第五章只保留仍阻塞开发或验收的问题，并写默认建议和影响。

- [ ] **Step 6: 检查表达**

Run:

```powershell
rg -n "旨在|赋能|助力|沉浸式|待补|如上|同上|相关内容|进行处理" 'prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md'
```

Expected: 无套话、占位词和模糊引用；“候选池、权重、30%、同轮不重复、随机切换时长”各有唯一完整定义。

### Task 4: 校验 PRD 和图片

**Files:**
- Verify: `prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md`
- Verify: `public/prd/game-blind-box/05-product-flow.png`

- [ ] **Step 1: 运行 PRD 质量校验**

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path 'prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md'
```

Expected: PASS；失败项修入正文后重跑。

- [ ] **Step 2: 运行图片校验**

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -PrdPath 'prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md'
```

Expected: 本地链接格式、40 位 SHA 和文件路径通过。

- [ ] **Step 3: 复核业务一致性**

逐项对比设计说明、Demo、流程图和 PRD：入口仍在游戏库首位；弹窗内随机；结果按钮仍为“查看详情”“再抽一次”；流程止于游戏详情；未新增下载、启动、Steam 登录、后台、奖励或灰度。

- [ ] **Step 4: 提交 PRD**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》游戏盲盒需求.md'
git commit -m "docs: streamline game blind box prd v1.8"
```

Expected: PRD 单独提交，便于审阅文字变化。

### Task 5: 更新工作流和任务板

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.md`
- Modify: `prd/workflow-state/GUANWANGGAID-38-game-blind-box.run.json`

- [ ] **Step 1: 重跑 S5—S8**

将本轮文案精简和流程图输入记为新决定；更新受影响步骤，记录源文件、机器验证和专业审查证据。Demo 标记为“无需修改”。

- [ ] **Step 2: 更新状态卡**

记录 V1.8 PRD、流程图路径、本地 Git 提交和验证结果；公开预览、远程图片和 Git 推送按实际状态填写，不把本地提交写成已发布。

- [ ] **Step 3: 更新 GUANWANGGAID-38**

追加一条短评论：PRD 已精简、流程图已合成、Demo 未改、校验结果及未执行的远程发布状态。事项保持 `in_review`，未经用户验收不移到 `done`。

- [ ] **Step 4: 检查工作区**

```powershell
git status --short
git log -5 --oneline
```

Expected: 只剩原有 `.superpowers/` 和 `node_modules/` 未跟踪目录；本轮目标文件均已提交。

## 远程发布边界

本计划只生成本地提交。未获得本轮 Git 推送授权时，不推送、不声称远程图片可用；获得授权后再推送目标分支，并运行带 `-VerifyRemote` 的图片校验。
