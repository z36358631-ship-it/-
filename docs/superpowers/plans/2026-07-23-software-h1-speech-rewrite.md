# 软件部门 2026 上半年度汇报演讲稿改写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2.2 版软件部门半年度汇报改写为面向公司 CEO 和创始人的 15 分钟中文演讲稿，并回写 PowerPoint 备注区。

**Architecture:** 保留原 PPT 页面和视觉内容不变，只替换演讲者备注及排练稿。讲稿以用户旅程为主线，以规模增长与用户成功不足的反差为骨架；页面数据作为证据，不作为逐项朗读内容。

**Tech Stack:** PowerPoint OOXML、`ppt-speech-writer` 脚本、Python JSON、`python-pptx`、`python-docx`、Windows PowerPoint 原生渲染。

---

### Task 1: 建立面向 CEO 的逐页证据与观点映射

**Files:**
- Read: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2.pptx`
- Read: `APP半年汇报/新建 文本文档.txt`
- Read: `APP半年汇报/软件部2026半年度汇报-PPT大纲.md`
- Read: `docs/superpowers/specs/2026-07-23-software-h1-speech-rewrite-design.md`
- Modify: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2-speaker-output/work/vision_review.json`

- [ ] **Step 1: 复核 10 页结构化内容与渲染图片**

确认 `slide_extract.json`、`visual_inventory.json` 和 `rendered_slides/slide_01.png` 至 `slide_10.png` 均存在，页面数量一致。

Run:

```powershell
python -c "from pathlib import Path; import json; b=next(Path.cwd().glob('APP*/软件部门*2.2-speaker-output')); e=json.loads((b/'work/slide_extract.json').read_text(encoding='utf-8')); print(e['slide_count'], len(list((b/'work/rendered_slides').glob('*.png'))))"
```

Expected: `10 10`

- [ ] **Step 2: 为每页确定一个 CEO 结论**

按设计说明建立以下映射：

```text
1 核心矛盾：能力建成了，但很多用户仍未获得成功体验
2 三问：为什么做、是否被采用、下半年解决什么
3 规模增长有效，但52%启动转化决定增长质量
4 横竖屏来自用户观察，不是视觉改版
5 产品有人用、云游可以收费、厂商愿意采用
6 登录墙、资源墙、启动墙阻断用户价值
7 下半年从功能数量转向用户、经营和复用结果
8 软件能力已经可以稳定支撑硬件生命周期
9 AI来自规模化服务与交付压力，不是口号
10 从“能做”走向“用户留下、业务付费、能力复用”
```

- [ ] **Step 3: 标记事实边界**

在 `vision_review.json` 中确保包含：

```text
论坛、访谈、竞品对标 = 定性需求线索
竖屏覆盖、云分享使用 = 采用证据
MAU、互动时长 = 与新版同期变化，不归因于单项功能
未来一年充值、营收 = 预测
厂商上线 = 交付验证，不等于商业成功
```

### Task 2: 重写干净版 PowerPoint 备注

**Files:**
- Modify: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2-speaker-output/work/notes.json`

- [ ] **Step 1: 按用户旅程重写第 1 至第 3 页**

写作约束：

```text
第1页：30秒内用“店面装修好了、客流上涨、用户空手而归”提出矛盾。
第2页：不朗读目录，只讲三个问题。
第3页：以“好消息是规模增长，真正让我警觉的是只有52%进入游戏”形成转折。
```

- [ ] **Step 2: 按洞察与验证重写第 4 至第 5 页**

必须包含：

```text
模拟器论坛观察
资深用户访谈
游戏平台竞品对标
横屏适合玩、竖屏适合找和看
接近一半用户采用竖屏
核心用户进入游戏后平均停留接近一小时
```

- [ ] **Step 3: 按三道墙与结果转向重写第 6 至第 7 页**

必须包含：

```text
登录墙
资源墙
配置、兼容与启动墙
下半年目标不是继续增加功能，而是让用户完成第一次成功体验
用户成功、商业经营、标准化交付三项结果
```

- [ ] **Step 4: 按公司级复用价值重写第 8 至第 10 页**

必须包含：

```text
硬件：版本节奏、11款手柄、零P0/P1、100%按期交付
AI：十万至二十万级日活下，人工无法完全承接配置和兼容咨询
结尾：用户愿意留下、业务愿意付费、能力能够复用
```

- [ ] **Step 5: 检查干净备注**

Run:

```powershell
python -c "from pathlib import Path; import json; b=next(Path.cwd().glob('APP*/软件部门*2.2-speaker-output')); n=json.loads((b/'work/notes.json').read_text(encoding='utf-8')); bad=[(x['slide'],t) for x in n for t in ['[Slide','[PAUSE]','[EMPHASIS','Transition:','这一页展示了','这一页主要讲'] if t in x['notes']]; print(len(n), bad)"
```

Expected: `10 []`

### Task 3: 重写排练稿并生成交付文件

**Files:**
- Modify: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2-speaker-output/work/display_document.json`
- Generate: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2-speaker-output/软件部门 2026 上半年度部门汇报 - 2.2-display.docx`
- Generate: `APP半年汇报/软件部门 2026 上半年度部门汇报 - 2.2-speaker-output/软件部门 2026 上半年度部门汇报 - 2.2-with-notes.pptx`

- [ ] **Step 1: 同步展示版讲稿**

每页展示版包含：

```text
[Slide X - 标题]
口播正文
[PAUSE]
[EMPHASIS: 本页核心观点]
Transition: 下一页的自然承接
```

排练稿总时长保持 15 分钟，单页只设置一个核心强调点。

- [ ] **Step 2: 生成排练稿**

Run:

```powershell
python C:\Users\z3635\.codex\skills\ppt-speech-writer\scripts\write_display_docx.py --input "<输出目录>\work\display_document.json" --output "<输出目录>\软件部门 2026 上半年度部门汇报 - 2.2-display.docx"
```

Expected: 输出 `saved:` 和目标 DOCX 路径。

- [ ] **Step 3: 覆盖写入 PowerPoint 备注**

Run:

```powershell
python C:\Users\z3635\.codex\skills\ppt-speech-writer\scripts\inject_notes.py --input "APP半年汇报\软件部门 2026 上半年度部门汇报 - 2.2.pptx" --output "<输出目录>\软件部门 2026 上半年度部门汇报 - 2.2-with-notes.pptx" --notes "<输出目录>\work\notes.json" --mode replace
```

Expected: 第 1 至第 10 页均显示 `replaced`。

- [ ] **Step 4: 验证备注和文件结构**

Run:

```powershell
python C:\Users\z3635\.codex\skills\ppt-speech-writer\scripts\read_slides.py "<输出目录>\软件部门 2026 上半年度部门汇报 - 2.2-with-notes.pptx" --output "<输出目录>\work\injected_verify.json"
```

Expected:

```text
slide_count = 10
10页 existing_notes 均非空
PPTX 与 DOCX ZIP 结构检查通过
总时长 = 900秒
```

- [ ] **Step 5: 复核去 AI 化与 CEO 口径**

检查：

```text
没有连续朗读三个以上页面字段
没有把定性线索写成全量结论
没有“赋能、抓手、闭环、沉淀、重塑”等可替换套话
每页开头均为观点、矛盾或具体场景
每页均能回答一个CEO关心的业务问题
```

